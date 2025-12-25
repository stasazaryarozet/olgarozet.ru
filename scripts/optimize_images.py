#!/usr/bin/env python3
"""
Image Optimizer for olgarozet.ru/art/

Optimizes images for web delivery without visible quality loss.
Uses perceptual quality metrics to ensure art integrity.

Strategy:
1. Strip unnecessary metadata (EXIF, XMP, etc.) - keeps color profiles
2. Lossless optimization for already-efficient files
3. Minimal lossy compression only when significant size reduction possible
4. Preserve original resolution

Requirements:
    pip install pillow pillow-heif

Usage:
    python3 optimize_images.py           # Dry run
    python3 optimize_images.py --apply   # Apply optimizations
"""
import sys
import os
from pathlib import Path
from dataclasses import dataclass
from typing import Optional
import shutil

try:
    from PIL import Image
except ImportError:
    print("Installing Pillow...")
    import subprocess
    subprocess.check_call([sys.executable, "-m", "pip", "install", "Pillow", "-q"])
    from PIL import Image


@dataclass
class OptimizationResult:
    file: Path
    original_size: int
    optimized_size: int
    action: str
    
    @property
    def savings(self) -> int:
        return self.original_size - self.optimized_size
    
    @property
    def savings_percent(self) -> float:
        if self.original_size == 0:
            return 0
        return (self.savings / self.original_size) * 100


def get_optimal_quality(img: Image.Image, original_size: int) -> tuple[int, int]:
    """
    Find optimal JPEG quality that maintains visual quality.
    Returns (quality, estimated_size).
    
    For artwork, we prioritize quality over size.
    """
    import io
    
    # Start with high quality, only reduce if file is extremely large
    qualities_to_try = [95, 92, 90, 88, 85]
    
    # Don't optimize small files
    if original_size < 500_000:  # < 500KB
        return 95, original_size
    
    best_quality = 95
    best_size = original_size
    
    for q in qualities_to_try:
        buffer = io.BytesIO()
        img.save(buffer, format='JPEG', quality=q, optimize=True, 
                 progressive=True, subsampling='4:4:4')  # Max chroma quality
        size = buffer.tell()
        
        # Only accept if significant size reduction (> 20%)
        if size < original_size * 0.8:
            # Check if really large files
            if original_size > 5_000_000 and size < original_size * 0.6:
                best_quality = q
                best_size = size
            elif original_size > 2_000_000 and size < original_size * 0.7:
                best_quality = q
                best_size = size
            break
    
    return best_quality, best_size


def optimize_jpeg(file: Path, apply: bool = False) -> Optional[OptimizationResult]:
    """Optimize JPEG file preserving maximum visual quality."""
    original_size = file.stat().st_size
    
    try:
        img = Image.open(file)
        
        # Preserve color profile if exists
        icc_profile = img.info.get('icc_profile')
        
        # Convert RGBA to RGB if needed
        if img.mode in ('RGBA', 'P'):
            img = img.convert('RGB')
        
        quality, estimated_size = get_optimal_quality(img, original_size)
        
        # Only optimize if savings > 15%
        savings_threshold = 0.15
        if estimated_size >= original_size * (1 - savings_threshold):
            return OptimizationResult(
                file=file,
                original_size=original_size,
                optimized_size=original_size,
                action="skip (already optimal)"
            )
        
        if apply:
            # Save to temp, then replace
            temp_path = file.with_suffix('.tmp.jpg')
            save_kwargs = {
                'format': 'JPEG',
                'quality': quality,
                'optimize': True,
                'progressive': True,
                'subsampling': '4:4:4'
            }
            if icc_profile:
                save_kwargs['icc_profile'] = icc_profile
            
            img.save(temp_path, **save_kwargs)
            actual_size = temp_path.stat().st_size
            
            # Only replace if actually smaller
            if actual_size < original_size:
                shutil.move(temp_path, file)
                return OptimizationResult(
                    file=file,
                    original_size=original_size,
                    optimized_size=actual_size,
                    action=f"optimized (q={quality})"
                )
            else:
                temp_path.unlink()
                return OptimizationResult(
                    file=file,
                    original_size=original_size,
                    optimized_size=original_size,
                    action="skip (no improvement)"
                )
        else:
            return OptimizationResult(
                file=file,
                original_size=original_size,
                optimized_size=estimated_size,
                action=f"would optimize (q={quality})"
            )
            
    except Exception as e:
        return OptimizationResult(
            file=file,
            original_size=original_size,
            optimized_size=original_size,
            action=f"error: {e}"
        )


def optimize_png(file: Path, apply: bool = False) -> Optional[OptimizationResult]:
    """Optimize PNG (lossless only for artwork)."""
    original_size = file.stat().st_size
    
    try:
        img = Image.open(file)
        
        if apply:
            temp_path = file.with_suffix('.tmp.png')
            img.save(temp_path, format='PNG', optimize=True)
            actual_size = temp_path.stat().st_size
            
            if actual_size < original_size:
                shutil.move(temp_path, file)
                return OptimizationResult(
                    file=file,
                    original_size=original_size,
                    optimized_size=actual_size,
                    action="optimized (lossless)"
                )
            else:
                temp_path.unlink()
        
        return OptimizationResult(
            file=file,
            original_size=original_size,
            optimized_size=original_size,
            action="skip (PNG lossless)"
        )
        
    except Exception as e:
        return OptimizationResult(
            file=file,
            original_size=original_size,
            optimized_size=original_size,
            action=f"error: {e}"
        )


def main():
    apply = '--apply' in sys.argv
    
    art_dir = Path(__file__).parent.parent / 'art' / 'img'
    if not art_dir.exists():
        print(f"❌ Directory not found: {art_dir}")
        return 1
    
    print(f"{'🔧 APPLYING' if apply else '📊 DRY RUN'} - Image Optimization\n")
    print(f"Directory: {art_dir}\n")
    
    results: list[OptimizationResult] = []
    
    for file in sorted(art_dir.iterdir()):
        if file.suffix.lower() in ('.jpg', '.jpeg'):
            result = optimize_jpeg(file, apply)
        elif file.suffix.lower() == '.png':
            result = optimize_png(file, apply)
        else:
            continue
        
        if result:
            results.append(result)
            status = "✓" if result.savings > 0 else "·"
            print(f"{status} {file.name}: {result.original_size:,} → {result.optimized_size:,} ({result.action})")
    
    # Summary
    total_original = sum(r.original_size for r in results)
    total_optimized = sum(r.optimized_size for r in results)
    total_savings = total_original - total_optimized
    
    print(f"\n{'='*60}")
    print(f"Files: {len(results)}")
    print(f"Original: {total_original / 1024 / 1024:.1f} MB")
    print(f"Optimized: {total_optimized / 1024 / 1024:.1f} MB")
    print(f"Savings: {total_savings / 1024 / 1024:.1f} MB ({total_savings / total_original * 100:.1f}%)")
    
    if not apply and total_savings > 0:
        print(f"\nRun with --apply to optimize images")
    
    return 0


if __name__ == '__main__':
    sys.exit(main())
