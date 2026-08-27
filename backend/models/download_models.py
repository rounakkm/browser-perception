"""
Model Download Utility for Browser Perception

This script downloads pre-trained ONNX models for:
- UI Element Detection (YOLOv8-nano fine-tuned for UI)
- Face Detection (BlazeFace)

Note: This is a placeholder implementation. In production, you would:
1. Host models on a CDN or model repository
2. Download them from HuggingFace or custom endpoint
3. Verify checksums for security
"""

import os
import sys
import argparse
from pathlib import Path

# Add parent directory to path
sys.path.insert(0, str(Path(__file__).parent.parent.parent))

from backend.config.settings import settings
from backend.config.logging import setup_logging, get_logger

logger = get_logger(__name__)

MODEL_SOURCES = {
    "yolov8-ui": {
        "filename": "yolov8-ui.onnx",
        "url": "https://example.com/models/yolov8-ui.onnx",  # Placeholder
        "description": "YOLOv8-nano fine-tuned for UI element detection",
        "size_mb": 6.2,
        "required": True
    },
    "blazeface": {
        "filename": "blazeface.onnx",
        "url": "https://example.com/models/blazeface.onnx",  # Placeholder
        "description": "BlazeFace model for face detection",
        "size_mb": 2.1,
        "required": False
    }
}


def download_model(model_name: str, force: bool = False) -> bool:
    """
    Download a model if it doesn't exist.

    Args:
        model_name: Name of the model to download
        force: Force re-download even if file exists

    Returns:
        True if successful, False otherwise
    """
    if model_name not in MODEL_SOURCES:
        logger.error(f"Unknown model: {model_name}")
        return False

    model_info = MODEL_SOURCES[model_name]
    model_path = os.path.join(settings.MODEL_DIR, model_info["filename"])

    # Check if model already exists
    if os.path.exists(model_path) and not force:
        logger.info(f"Model {model_name} already exists at {model_path}")
        return True

    logger.info(f"Downloading {model_name}...")
    logger.info(f"  Description: {model_info['description']}")
    logger.info(f"  Size: {model_info['size_mb']} MB")
    logger.info(f"  URL: {model_info['url']}")

    # Placeholder: In production, implement actual download
    logger.warning("⚠️  Model download not implemented - placeholder only")
    logger.info("To use vision detection, manually place ONNX models in:")
    logger.info(f"  - {os.path.abspath(settings.MODEL_DIR)}")
    logger.info(f"Expected filename: {model_info['filename']}")

    # For SIH demo, you can:
    # 1. Train YOLOv8 on UI dataset and export to ONNX
    # 2. Download pre-trained models from HuggingFace
    # 3. Use models from TensorFlow Hub converted to ONNX

    return False


def download_all_models(force: bool = False) -> bool:
    """
    Download all required models.

    Args:
        force: Force re-download even if files exist

    Returns:
        True if all required models are available
    """
    settings.ensure_directories()

    success = True
    for model_name, model_info in MODEL_SOURCES.items():
        result = download_model(model_name, force)

        if model_info["required"] and not result:
            logger.error(f"Required model {model_name} not available")
            success = False
        elif not result:
            logger.warning(f"Optional model {model_name} not available")

    return success


def list_models():
    """List all models and their status."""
    print("\nAvailable Models:")
    print("=" * 80)

    for model_name, model_info in MODEL_SOURCES.items():
        model_path = os.path.join(settings.MODEL_DIR, model_info["filename"])
        exists = os.path.exists(model_path)

        status = "✓ FOUND" if exists else "✗ MISSING"
        required = "REQUIRED" if model_info["required"] else "OPTIONAL"

        print(f"\n{model_name} [{required}] - {status}")
        print(f"  Description: {model_info['description']}")
        print(f"  Size: {model_info['size_mb']} MB")
        print(f"  Path: {model_path}")

        if exists:
            size_bytes = os.path.getsize(model_path)
            print(f"  Actual Size: {size_bytes / (1024*1024):.2f} MB")

    print("\n" + "=" * 80)


def verify_models() -> bool:
    """
    Verify that all required models are present and valid.

    Returns:
        True if all required models are available
    """
    all_present = True

    for model_name, model_info in MODEL_SOURCES.items():
        if not model_info["required"]:
            continue

        model_path = os.path.join(settings.MODEL_DIR, model_info["filename"])

        if not os.path.exists(model_path):
            logger.error(f"Required model missing: {model_name} at {model_path}")
            all_present = False
        else:
            logger.info(f"Required model found: {model_name}")

    return all_present


def create_dummy_models():
    """
    Create dummy model files for testing purposes.
    WARNING: These are not real models - vision detection will fail!
    """
    settings.ensure_directories()

    logger.warning("Creating dummy model files for testing...")
    logger.warning("These are NOT real models - vision detection will be disabled!")

    for model_name, model_info in MODEL_SOURCES.items():
        model_path = os.path.join(settings.MODEL_DIR, model_info["filename"])

        if os.path.exists(model_path):
            logger.info(f"Skipping {model_name} - already exists")
            continue

        # Create empty file
        with open(model_path, 'w') as f:
            f.write(f"# Dummy model file for {model_name}\n")
            f.write("# Replace with real ONNX model\n")

        logger.info(f"Created dummy: {model_path}")

    logger.warning("⚠️  Replace dummy files with real ONNX models before using vision detection!")


def main():
    parser = argparse.ArgumentParser(description="Download models for Browser Perception")

    parser.add_argument(
        "action",
        choices=["download", "list", "verify", "dummy"],
        help="Action to perform"
    )

    parser.add_argument(
        "--model",
        help="Specific model to download (default: all)"
    )

    parser.add_argument(
        "--force",
        action="store_true",
        help="Force re-download even if file exists"
    )

    args = parser.parse_args()

    setup_logging()

    if args.action == "list":
        list_models()

    elif args.action == "verify":
        if verify_models():
            logger.info("✓ All required models are present")
            sys.exit(0)
        else:
            logger.error("✗ Some required models are missing")
            sys.exit(1)

    elif args.action == "dummy":
        create_dummy_models()

    elif args.action == "download":
        if args.model:
            success = download_model(args.model, args.force)
        else:
            success = download_all_models(args.force)

        if success:
            logger.info("✓ Model download completed")
            sys.exit(0)
        else:
            logger.warning("⚠️  Some models could not be downloaded")
            logger.info("For testing, you can create dummy files with: python download_models.py dummy")
            sys.exit(1)


if __name__ == "__main__":
    main()
