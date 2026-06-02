import os
import tempfile
from pathlib import Path

import pytest
from PIL import Image


@pytest.fixture
def temp_dir():
    with tempfile.TemporaryDirectory() as tmpdir:
        original_cwd = Path.cwd()
        os.chdir(tmpdir)
        yield Path(tmpdir)
        os.chdir(original_cwd)


@pytest.fixture
def texture_dir(temp_dir):
    texture_dir = temp_dir / "runtime" / "haru_greeter_t05.2048"
    texture_dir.mkdir(parents=True, exist_ok=True)
    return texture_dir


@pytest.fixture
def texture_png(texture_dir):
    path = texture_dir / "texture_01.png"
    img = Image.new("RGBA", (2048, 2048), (255, 255, 255, 255))
    img.save(path)
    return path


@pytest.fixture
def backup_png(texture_dir):
    path = texture_dir / "texture_01_backup.png"
    img = Image.new("RGBA", (2048, 2048), (200, 200, 200, 255))
    img.save(path)
    return path


@pytest.fixture
def sample_image(temp_dir):
    path = temp_dir / "sample_tshirt.jpg"
    img = Image.new("RGB", (512, 512), (255, 0, 0))
    img.save(path, "JPEG")
    return path


@pytest.fixture
def gemini_api_key(monkeypatch):
    key = "test-gemini-api-key"
    monkeypatch.setenv("GEMINI_API_KEY", key)
    return key
