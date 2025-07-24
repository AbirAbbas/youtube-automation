# CUDA Setup Guide for RTX 4090 TTS Acceleration

Your local TTS is working perfectly with CPU, but to unleash the full power of your RTX 4090, you need to fix the CUDA setup.

## Current Status
✅ TTS working with CPU (excellent quality with Tortoise/VITS)  
✅ **FIXED**: GPU acceleration working with WSL2 library path

## CUDA Error Solution (WSL2)

### The Fix That Worked
For WSL2 systems, add this to your `~/.bashrc`:
```bash
export LD_LIBRARY_PATH=/usr/lib/wsl/lib:$LD_LIBRARY_PATH
```

Then reload:
```bash
source ~/.bashrc
```

This makes WSL2's CUDA libraries available to PyTorch and TTS.

## Alternative Fixes (If Above Doesn't Work)

### 1. Check Your NVIDIA Driver
```bash
nvidia-smi
```
This should show your RTX 4090. If not, install NVIDIA drivers first.

### 2. Install CUDA Toolkit
```bash
# For Ubuntu/Debian
wget https://developer.download.nvidia.com/compute/cuda/repos/ubuntu2004/x86_64/cuda-keyring_1.0-1_all.deb
sudo dpkg -i cuda-keyring_1.0-1_all.deb
sudo apt-get update
sudo apt-get -y install cuda

# Add to ~/.bashrc
echo 'export PATH=/usr/local/cuda/bin:$PATH' >> ~/.bashrc
echo 'export LD_LIBRARY_PATH=/usr/local/cuda/lib64:$LD_LIBRARY_PATH' >> ~/.bashrc
source ~/.bashrc
```

### 3. Reinstall PyTorch with CUDA Support
```bash
# Uninstall current PyTorch
pip uninstall torch torchaudio

# Install PyTorch with CUDA 11.8 (adjust version as needed)
pip install torch torchaudio --index-url https://download.pytorch.org/whl/cu118
```

### 4. Test CUDA Installation
```bash
python3 -c "import torch; print('CUDA available:', torch.cuda.is_available()); print('GPU name:', torch.cuda.get_device_name(0) if torch.cuda.is_available() else 'None')"
```

### 5. Test TTS with GPU
```bash
node test-local-tts.js
```

## Performance with RTX 4090

Now that GPU is working, you'll get:
- **Faster generation**: 3-5x speed improvement
- **Better models**: Can handle XTTS-v2 and Tortoise smoothly  
- **Voice cloning**: Real-time voice cloning with XTTS-v2
- **Multiple languages**: 17 languages with XTTS-v2

## WSL2 Notes

- WSL2 provides CUDA libraries via Windows
- No need to install CUDA toolkit separately
- Just need the correct library path
- RTX 4090 works perfectly through WSL2 