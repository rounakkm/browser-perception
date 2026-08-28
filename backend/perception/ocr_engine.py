import re
from typing import List, Optional, Dict, Any
from backend.models.domain import VisualElement, DOMElement
from backend.config.logging import get_logger

logger = get_logger(__name__)

class OCRPerceptionEngine:
    """
    OCR Engine for extracting and analyzing text from DOM elements and optionally from screenshots.
    Uses pytesseract when available, with NER for entity extraction.
    """

    def __init__(self):
        self.tesseract_available = False
        self.spacy_available = False
        self.nlp = None

        try:
            import pytesseract
            self.pytesseract = pytesseract
            self.tesseract_available = True
            logger.info("Tesseract OCR available")
        except ImportError:
            logger.warning("Tesseract not available - OCR disabled")
            self.pytesseract = None

        try:
            import spacy
            try:
                self.nlp = spacy.load("en_core_web_md")
                self.spacy_available = True
                logger.info("SpaCy NER model loaded")
            except OSError:
                logger.warning("SpaCy model en_core_web_md not found - NER disabled")
                self.spacy_available = False
        except ImportError:
            logger.warning("SpaCy not available - NER disabled")
            self.spacy_available = False

    def extract_visual_text(self, elements: List[DOMElement], screenshot_path: Optional[str] = None) -> List[VisualElement]:
        """Extract text from DOM elements with confidence scores."""
        visual_findings = []

        for elem in elements:
            if not elem.is_interactive and elem.text:
                if any(kw in elem.text.lower() for kw in ["account", "email", "phone", "pin", "card", "number", "id"]):
                    visual_findings.append(VisualElement(
                        bbox=elem.bbox or [0, 0, 0, 0],
                        text_content=elem.text,
                        confidence=0.95
                    ))

        return visual_findings

    def extract_text_from_screenshot(self, screenshot_path: str) -> Optional[List[Dict[str, Any]]]:
        """
        Extract text from screenshot using OCR if available.

        Returns:
            List of text extractions with bounding boxes, or None if OCR unavailable.
        """
        if not self.tesseract_available or not screenshot_path:
            return None

        try:
            from PIL import Image
            import cv2
            import numpy as np

            img = Image.open(screenshot_path)
            img_array = np.array(img)

            if len(img_array.shape) == 3:
                gray = cv2.cvtColor(img_array, cv2.COLOR_RGB2GRAY)
            else:
                gray = img_array

            _, thresh = cv2.threshold(gray, 150, 255, cv2.THRESH_BINARY)

            ocr_data = self.pytesseract.image_to_data(thresh, output_type=self.pytesseract.Output.DICT)

            results = []
            for i in range(len(ocr_data['text'])):
                text = ocr_data['text'][i].strip()
                conf = int(ocr_data['conf'][i])

                if text and conf > 30:
                    results.append({
                        'text': text,
                        'confidence': conf / 100.0,
                        'bbox': [
                            ocr_data['left'][i],
                            ocr_data['top'][i],
                            ocr_data['width'][i],
                            ocr_data['height'][i]
                        ]
                    })

            logger.debug(f"OCR extracted {len(results)} text regions from screenshot")
            return results

        except Exception as e:
            logger.warning(f"OCR extraction failed: {e}")
            return None

    def detect_pii_entities(self, text: str) -> Optional[List[Dict[str, Any]]]:
        """
        Detect PII entities in text using NER if available.

        Returns:
            List of detected entities with types and confidence.
        """
        if not self.spacy_available or not text:
            return None

        try:
            doc = self.nlp(text)
            entities = []

            for ent in doc.ents:
                entity_info = {
                    'text': ent.text,
                    'type': ent.label_,
                    'start': ent.start_char,
                    'end': ent.end_char,
                    'confidence': 0.95
                }

                label_mapping = {
                    'PERSON': 'PERSON_NAME',
                    'ORG': 'ORGANIZATION',
                    'GPE': 'LOCATION',
                    'DATE': 'DATE',
                    'MONEY': 'FINANCIAL',
                    'FAC': 'LOCATION',
                    'PRODUCT': 'PRODUCT',
                    'EVENT': 'EVENT',
                    'LAW': 'LEGAL',
                    'LANGUAGE': 'LANGUAGE',
                    'NORP': 'GROUP'
                }

                entity_info['pii_category'] = label_mapping.get(ent.label_, ent.label_)
                entities.append(entity_info)

            logger.debug(f"NER detected {len(entities)} named entities")
            return entities

        except Exception as e:
            logger.warning(f"NER detection failed: {e}")
            return None

    def correlate_with_dom(self, ocr_results: Optional[List[Dict]], dom_elements: List[DOMElement]) -> List[DOMElement]:
        """
        Correlate OCR results with DOM elements based on spatial overlap.

        Returns:
            Enhanced DOM elements with OCR and NER information.
        """
        if not ocr_results:
            return dom_elements

        enhanced_elements = []

        for elem in dom_elements:
            enhanced_elem = elem.copy(deep=True)

            if elem.bbox:
                elem_box = set(range(elem.bbox[0], elem.bbox[0] + elem.bbox[2])) | \
                          set(range(elem.bbox[1], elem.bbox[1] + elem.bbox[3]))

                for ocr_result in ocr_results:
                    ocr_box = ocr_result['bbox']
                    ocr_region = set(range(ocr_box[0], ocr_box[0] + ocr_box[2])) | \
                                set(range(ocr_box[1], ocr_box[1] + ocr_box[3]))

                    if elem_box & ocr_region:
                        if not enhanced_elem.text or len(ocr_result['text']) > len(enhanced_elem.text):
                            enhanced_elem.text = ocr_result['text']

            enhanced_elements.append(enhanced_elem)

        return enhanced_elements

    def analyze_text_content(self, text: str) -> Dict[str, Any]:
        """
        Comprehensive text analysis combining NER and keyword detection.

        Returns:
            Analysis results with detected entities and keywords.
        """
        analysis = {
            'text': text,
            'entities': self.detect_pii_entities(text) or [],
            'keywords': [],
            'has_potential_pii': False
        }

        sensitive_keywords = [
            'password', 'secret', 'pin', 'cvv', 'account', 'card',
            'aadhaar', 'pan', 'ssn', 'email', 'phone', 'address'
        ]

        for keyword in sensitive_keywords:
            if keyword.lower() in text.lower():
                analysis['keywords'].append(keyword)
                analysis['has_potential_pii'] = True

        pii_patterns = {
            'email': r'[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+',
            'phone': r'\+?\d{1,4}[-.\s]?\(?\d{1,3}\)?[-.\s]?\d{3,4}[-.\s]?\d{4}',
            'aadhaar': r'\b\d{4}[-\s]?\d{4}[-\s]?\d{4}\b',
            'pan': r'\b[A-Z]{5}[0-9]{4}[A-Z]{1}\b',
        }

        for pattern_name, pattern in pii_patterns.items():
            if re.search(pattern, text):
                analysis['keywords'].append(f"pattern:{pattern_name}")
                analysis['has_potential_pii'] = True

        return analysis
