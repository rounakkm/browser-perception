from typing import List, Optional, Dict, Any
from backend.models.domain import VisualElement
from backend.config.settings import settings
from backend.config.logging import get_logger
import os
import numpy as np

logger = get_logger(__name__)

class VisionModelPerceptionEngine:
    """
    Vision engine for UI element detection using ONNX models.
    Supports YOLOv8-based UI element detection with configurable confidence thresholds.
    """

    def __init__(self, model_path: Optional[str] = None):
        self.model_path = model_path or settings.YOLO_MODEL_PATH
        self.is_loaded = False
        self.session = None
        self.input_size = settings.VISION_INPUT_SIZE
        self.confidence_threshold = settings.VISION_CONFIDENCE_THRESHOLD
        self.iou_threshold = settings.VISION_IOU_THRESHOLD

        # UI element class labels (YOLO format)
        self.class_labels = [
            "button", "input", "text", "image", "link",
            "checkbox", "dropdown", "icon", "label", "container"
        ]

        self._load_model()

    def _load_model(self):
        """Load ONNX model if available."""
        if not os.path.exists(self.model_path):
            logger.warning(f"Model not found at {self.model_path} - Vision detection disabled")
            self.is_loaded = False
            return

        try:
            import onnxruntime as ort

            # Determine execution provider
            device = settings.get_device()
            if device == "cuda":
                providers = ['CUDAExecutionProvider', 'CPUExecutionProvider']
            else:
                providers = ['CPUExecutionProvider']

            self.session = ort.InferenceSession(self.model_path, providers=providers)
            self.is_loaded = True

            # Get input/output info
            self.input_name = self.session.get_inputs()[0].name
            self.output_names = [o.name for o in self.session.get_outputs()]

            logger.info(f"ONNX model loaded successfully on {device}")
            logger.debug(f"Model input: {self.input_name}, outputs: {self.output_names}")

        except ImportError:
            logger.warning("ONNX Runtime not available - Vision detection disabled")
            self.is_loaded = False
        except Exception as e:
            logger.error(f"Failed to load ONNX model: {e}")
            self.is_loaded = False

    def _preprocess_image(self, image_path: str) -> Optional[np.ndarray]:
        """
        Preprocess image for model inference.

        Args:
            image_path: Path to the image file

        Returns:
            Preprocessed image tensor or None if preprocessing failed
        """
        try:
            import cv2

            # Read image
            img = cv2.imread(image_path)
            if img is None:
                logger.warning(f"Failed to read image: {image_path}")
                return None

            # Store original dimensions for coordinate mapping
            self.original_height, self.original_width = img.shape[:2]

            # Resize to model input size
            img_resized = cv2.resize(img, (self.input_size, self.input_size))

            # Convert BGR to RGB
            img_rgb = cv2.cvtColor(img_resized, cv2.COLOR_BGR2RGB)

            # Normalize to [0, 1]
            img_normalized = img_rgb.astype(np.float32) / 255.0

            # Transpose to (C, H, W) and add batch dimension
            img_tensor = np.transpose(img_normalized, (2, 0, 1))
            img_tensor = np.expand_dims(img_tensor, axis=0)

            return img_tensor

        except ImportError:
            logger.warning("OpenCV not available for image preprocessing")
            return None
        except Exception as e:
            logger.error(f"Image preprocessing failed: {e}")
            return None

    def _postprocess_output(self, outputs: np.ndarray) -> List[Dict[str, Any]]:
        """
        Postprocess model output to extract detections.

        Args:
            outputs: Raw model output tensor

        Returns:
            List of detected elements with bounding boxes and labels
        """
        detections = []

        try:
            # YOLOv8 output format: (batch, num_detections, 4 + num_classes)
            # Typically shape is (1, 84, 8400) for YOLOv8-nano

            output = outputs[0]  # Remove batch dimension

            # Transpose if needed (YOLOv8 outputs as (1, 84, 8400))
            if output.shape[0] == 84 or output.shape[0] > 100:
                output = output.T

            # Extract boxes, scores, and class IDs
            boxes = output[:, :4]
            scores = output[:, 4]

            # If multiple classes, get max class score
            if output.shape[1] > 5:
                class_scores = output[:, 4:]
                class_ids = np.argmax(class_scores, axis=1)
                scores = np.max(class_scores, axis=1)
            else:
                class_ids = np.zeros(len(output), dtype=int)

            # Filter by confidence threshold
            mask = scores > self.confidence_threshold
            boxes = boxes[mask]
            scores = scores[mask]
            class_ids = class_ids[mask]

            # Apply Non-Maximum Suppression
            if len(boxes) > 0:
                boxes_nms, scores_nms, class_ids_nms = self._nms(boxes, scores, class_ids)

                for box, score, class_id in zip(boxes_nms, scores_nms, class_ids_nms):
                    # Convert coordinates from normalized to original image size
                    x_center, y_center, width, height = box

                    # Scale to original image dimensions
                    x_center = x_center * self.original_width / self.input_size
                    y_center = y_center * self.original_height / self.input_size
                    width = width * self.original_width / self.input_size
                    height = height * self.original_height / self.input_size

                    # Convert to top-left corner format
                    x = int(x_center - width / 2)
                    y = int(y_center - height / 2)
                    w = int(width)
                    h = int(height)

                    class_name = self.class_labels[class_id] if class_id < len(self.class_labels) else f"class_{class_id}"

                    detections.append({
                        'bbox': [x, y, w, h],
                        'label': class_name,
                        'confidence': float(score)
                    })

        except Exception as e:
            logger.error(f"Postprocessing failed: {e}")

        return detections

    def _nms(self, boxes: np.ndarray, scores: np.ndarray, class_ids: np.ndarray) -> tuple:
        """
        Apply Non-Maximum Suppression.

        Args:
            boxes: Bounding boxes (x_center, y_center, width, height)
            scores: Confidence scores
            class_ids: Class IDs

        Returns:
            Filtered boxes, scores, and class IDs
        """
        try:
            import cv2

            # Convert boxes to (x, y, width, height) format for NMS
            boxes_xywh = boxes.copy()
            boxes_xywh[:, 0] = boxes[:, 0] - boxes[:, 2] / 2  # x_center to x
            boxes_xywh[:, 1] = boxes[:, 1] - boxes[:, 3] / 2  # y_center to y

            # Convert to (x1, y1, x2, y2) for NMSBoxes
            boxes_xyxy = boxes_xywh.copy()
            boxes_xyxy[:, 2] = boxes_xyxy[:, 0] + boxes_xyxy[:, 2]
            boxes_xyxy[:, 3] = boxes_xyxy[:, 1] + boxes_xyxy[:, 3]

            # Apply NMS
            indices = cv2.dnn.NMSBoxes(
                boxes_xyxy.tolist(),
                scores.tolist(),
                self.confidence_threshold,
                self.iou_threshold
            )

            if len(indices) > 0:
                indices = indices.flatten()
                return boxes[indices], scores[indices], class_ids[indices]

        except Exception as e:
            logger.warning(f"NMS failed, using all detections: {e}")

        return boxes, scores, class_ids

    def detect_ui_bounding_boxes(self, screenshot_path: str) -> List[VisualElement]:
        """
        Run visual object detection on webpage screenshots.

        Args:
            screenshot_path: Path to the screenshot image

        Returns:
            List of detected UI elements with bounding boxes
        """
        if not self.is_loaded:
            logger.debug("Vision model not loaded, returning empty detections")
            return []

        # Preprocess image
        img_tensor = self._preprocess_image(screenshot_path)
        if img_tensor is None:
            return []

        try:
            # Run inference
            outputs = self.session.run(self.output_names, {self.input_name: img_tensor})

            # Postprocess
            detections = self._postprocess_output(outputs[0])

            # Convert to VisualElement format
            visual_elements = []
            for det in detections:
                visual_elements.append(VisualElement(
                    bbox=det['bbox'],
                    text_content=det['label'],
                    confidence=det['confidence']
                ))

            logger.info(f"Detected {len(visual_elements)} UI elements from screenshot")
            return visual_elements

        except Exception as e:
            logger.error(f"Vision detection failed: {e}")
            return []

    def get_model_info(self) -> Dict[str, Any]:
        """Get information about the loaded model."""
        return {
            'loaded': self.is_loaded,
            'model_path': self.model_path,
            'input_size': self.input_size,
            'confidence_threshold': self.confidence_threshold,
            'iou_threshold': self.iou_threshold,
            'num_classes': len(self.class_labels),
            'device': settings.get_device()
        }