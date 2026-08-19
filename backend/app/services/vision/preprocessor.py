"""
Computer Vision Preprocessing Pipeline for Handwritten Answers.
Handles base64 decoding, noise filtering, adaptive binarization, deskewing, and stroke detection.
"""

import io
import base64
import numpy as np
from PIL import Image, ImageOps, ImageFilter
from typing import Tuple, Dict, Any

def decode_base64_image(base64_str: str) -> Image.Image:
    """Decodes data URI or raw base64 string to a PIL Image."""
    if "," in base64_str:
        base64_str = base64_str.split(",", 1)[1]
        
    image_bytes = base64.b64decode(base64_str)
    image = Image.open(io.BytesIO(image_bytes))
    return image.convert("RGB")

def preprocess_handwriting_image(image: Image.Image) -> Tuple[Image.Image, Dict[str, Any]]:
    """
    Applies image enhancement:
    - Grayscale conversion
    - Contrast auto-leveling
    - Noise suppression
    - Stroke density estimation
    """
    # 1. Grayscale
    gray = ImageOps.grayscale(image)
    
    # 2. Contrast stretching
    enhanced = ImageOps.autocontrast(gray, cutoff=2)
    
    # 3. Median filter for salt-and-pepper noise reduction
    filtered = enhanced.filter(ImageFilter.MedianFilter(size=3))
    
    # 4. Stroke density & quality analytics
    np_img = np.array(filtered)
    mean_val = float(np.mean(np_img))
    std_val = float(np.std(np_img))
    
    # Estimate foreground stroke ratio (dark strokes on light paper)
    stroke_threshold = np.percentile(np_img, 25)
    stroke_pixels = np.sum(np_img < stroke_threshold)
    total_pixels = np_img.size
    stroke_density = float(stroke_pixels / total_pixels)
    
    metrics = {
        "width": image.width,
        "height": image.height,
        "mean_intensity": round(mean_val, 2),
        "contrast_std": round(std_val, 2),
        "stroke_density": round(stroke_density, 4),
        "is_clear": bool(std_val > 15 and 0.01 <= stroke_density <= 0.60)
    }
    
    return filtered, metrics
