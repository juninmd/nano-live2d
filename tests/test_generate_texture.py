import os
from pathlib import Path
from unittest.mock import MagicMock, patch

import pytest
from PIL import Image


class TestBackupAndRestore:
    def test_backup_texture_creates_backup(self, texture_png, backup_png):
        backup_png.unlink(missing_ok=True)
        import generate_texture

        original = generate_texture.TEXTURE_PATH
        backup = generate_texture.BACKUP_PATH
        generate_texture.TEXTURE_PATH = texture_png
        generate_texture.BACKUP_PATH = backup_png

        result = generate_texture.backup_texture()

        assert result is True
        assert backup_png.exists()

        generate_texture.TEXTURE_PATH = original
        generate_texture.BACKUP_PATH = backup

    def test_backup_texture_returns_false_when_missing(self, temp_dir):
        import generate_texture

        fake = temp_dir / "nonexistent.png"
        original = generate_texture.TEXTURE_PATH
        generate_texture.TEXTURE_PATH = fake

        result = generate_texture.backup_texture()

        assert result is False

        generate_texture.TEXTURE_PATH = original

    def test_restore_texture_restores_backup(self, texture_png, backup_png):
        import generate_texture

        original_tex = generate_texture.TEXTURE_PATH
        original_bak = generate_texture.BACKUP_PATH
        generate_texture.TEXTURE_PATH = texture_png
        generate_texture.BACKUP_PATH = backup_png

        texture_png.write_text("modified", encoding="utf-8")

        result = generate_texture.restore_texture()

        assert result is True
        assert texture_png.read_bytes() == backup_png.read_bytes()

        generate_texture.TEXTURE_PATH = original_tex
        generate_texture.BACKUP_PATH = original_bak

    def test_restore_texture_returns_false_when_no_backup(self, texture_png, temp_dir):
        import generate_texture

        fake_bak = temp_dir / "nonexistent_backup.png"
        original_tex = generate_texture.TEXTURE_PATH
        original_bak = generate_texture.BACKUP_PATH
        generate_texture.TEXTURE_PATH = texture_png
        generate_texture.BACKUP_PATH = fake_bak

        result = generate_texture.restore_texture()

        assert result is False

        generate_texture.TEXTURE_PATH = original_tex
        generate_texture.BACKUP_PATH = original_bak


class TestLoadAndEncodeImage:
    def test_load_and_encode_image_success(self, sample_image):
        import generate_texture

        result = generate_texture.load_and_encode_image(str(sample_image))

        assert result is not None
        assert isinstance(result, str)
        assert len(result) > 0

    def test_load_and_encode_image_returns_none_on_failure(self, temp_dir):
        import generate_texture

        result = generate_texture.load_and_encode_image(str(temp_dir / "does_not_exist.jpg"))

        assert result is None


class TestUnderstandClothingImage:
    def test_returns_none_without_api_key(self, sample_image, monkeypatch):
        monkeypatch.delenv("GEMINI_API_KEY", raising=False)
        import generate_texture

        result = generate_texture.understand_clothing_image(str(sample_image), None)

        assert result is None

    @patch("generate_texture.requests.post")
    def test_returns_description_on_success(self, mock_post, sample_image, gemini_api_key):
        import generate_texture

        mock_response = MagicMock()
        mock_response.status_code = 200
        mock_response.json.return_value = {
            "candidates": [{"content": {"parts": [{"text": "A red t-shirt with short sleeves"}]}}]
        }
        mock_post.return_value = mock_response

        result = generate_texture.understand_clothing_image(str(sample_image), gemini_api_key)

        assert result == "A red t-shirt with short sleeves"

    @patch("generate_texture.requests.post")
    def test_returns_none_on_api_error(self, mock_post, sample_image, gemini_api_key):
        import generate_texture

        mock_response = MagicMock()
        mock_response.status_code = 500
        mock_post.return_value = mock_response

        result = generate_texture.understand_clothing_image(str(sample_image), gemini_api_key)

        assert result is None

    @patch("generate_texture.requests.post")
    def test_returns_none_on_empty_response(self, mock_post, sample_image, gemini_api_key):
        import generate_texture

        mock_response = MagicMock()
        mock_response.status_code = 200
        mock_response.json.return_value = {"candidates": []}
        mock_post.return_value = mock_response

        result = generate_texture.understand_clothing_image(str(sample_image), gemini_api_key)

        assert result is None


class TestGenerateNewTexture:
    @patch("generate_texture.requests.post")
    def test_generates_texture_successfully(self, mock_post, texture_png, gemini_api_key):
        import generate_texture
        import base64
        import io
        from PIL import Image

        original_tex = generate_texture.TEXTURE_PATH
        original_bak = generate_texture.BACKUP_PATH
        generate_texture.TEXTURE_PATH = texture_png

        img = Image.new("RGBA", (2048, 2048), (100, 150, 200, 255))
        buf = io.BytesIO()
        img.save(buf, "PNG")
        img_b64 = base64.b64encode(buf.getvalue()).decode("utf-8")

        mock_response = MagicMock()
        mock_response.status_code = 200
        mock_response.json.return_value = {
            "candidates": [{"content": {"parts": [{"inlineData": {"data": img_b64}}]}}]
        }
        mock_post.return_value = mock_response

        result = generate_texture.generate_new_texture_with_clothing("blue jeans", gemini_api_key)

        assert result is True
        assert texture_png.exists()
        loaded = Image.open(texture_png)
        assert loaded.size == (2048, 2048)

        generate_texture.TEXTURE_PATH = original_tex
        generate_texture.BACKUP_PATH = original_bak

    def test_returns_false_without_api_key(self, texture_png, monkeypatch):
        monkeypatch.delenv("GEMINI_API_KEY", raising=False)
        import generate_texture

        original_tex = generate_texture.TEXTURE_PATH
        generate_texture.TEXTURE_PATH = texture_png

        result = generate_texture.generate_new_texture_with_clothing("blue jeans", None)

        assert result is False

        generate_texture.TEXTURE_PATH = original_tex

    @patch("generate_texture.requests.post")
    def test_returns_false_on_api_error(self, mock_post, texture_png, gemini_api_key):
        import generate_texture

        original_tex = generate_texture.TEXTURE_PATH
        generate_texture.TEXTURE_PATH = texture_png

        mock_response = MagicMock()
        mock_response.status_code = 500
        mock_post.return_value = mock_response

        result = generate_texture.generate_new_texture_with_clothing("blue jeans", gemini_api_key)

        assert result is False

        generate_texture.TEXTURE_PATH = original_tex


class TestMainFunction:
    @patch("generate_texture.generate_new_texture_with_clothing")
    @patch("generate_texture.input")
    def test_main_text_description_flow(
        self, mock_input, mock_generate, gemini_api_key, texture_png, backup_png
    ):
        import generate_texture

        original_tex = generate_texture.TEXTURE_PATH
        original_bak = generate_texture.BACKUP_PATH
        generate_texture.TEXTURE_PATH = texture_png
        generate_texture.BACKUP_PATH = backup_png

        mock_generate.return_value = True
        mock_input.side_effect = ["red hoodie", "quit"]

        result = generate_texture.main()

        mock_generate.assert_called_once_with("red hoodie", gemini_api_key)

        generate_texture.TEXTURE_PATH = original_tex
        generate_texture.BACKUP_PATH = original_bak

    @patch("generate_texture.restore_texture")
    @patch("generate_texture.input")
    def test_main_restore_flow(
        self, mock_input, mock_restore, gemini_api_key, texture_png, backup_png
    ):
        import generate_texture

        original_tex = generate_texture.TEXTURE_PATH
        original_bak = generate_texture.BACKUP_PATH
        generate_texture.TEXTURE_PATH = texture_png
        generate_texture.BACKUP_PATH = backup_png

        mock_input.side_effect = ["restore", "quit"]

        generate_texture.main()

        mock_restore.assert_called_once()

        generate_texture.TEXTURE_PATH = original_tex
        generate_texture.BACKUP_PATH = original_bak

    @patch("generate_texture.input")
    def test_main_quit_directly(self, mock_input, gemini_api_key, texture_png, backup_png):
        import generate_texture

        original_tex = generate_texture.TEXTURE_PATH
        original_bak = generate_texture.BACKUP_PATH
        generate_texture.TEXTURE_PATH = texture_png
        generate_texture.BACKUP_PATH = backup_png

        mock_input.side_effect = ["quit"]

        generate_texture.main()

        generate_texture.TEXTURE_PATH = original_tex
        generate_texture.BACKUP_PATH = original_bak

    @patch("generate_texture.understand_clothing_image")
    @patch("generate_texture.generate_new_texture_with_clothing")
    @patch("generate_texture.input")
    def test_main_image_upload_flow(
        self,
        mock_input,
        mock_generate,
        mock_understand,
        gemini_api_key,
        texture_png,
        backup_png,
        sample_image,
    ):
        import generate_texture

        original_tex = generate_texture.TEXTURE_PATH
        original_bak = generate_texture.BACKUP_PATH
        generate_texture.TEXTURE_PATH = texture_png
        generate_texture.BACKUP_PATH = backup_png

        mock_understand.return_value = "A red garment"
        mock_generate.return_value = True
        mock_input.side_effect = [str(sample_image), "y", "quit"]

        generate_texture.main()

        mock_understand.assert_called_once_with(str(sample_image), gemini_api_key)
        mock_generate.assert_called_once()

        generate_texture.TEXTURE_PATH = original_tex
        generate_texture.BACKUP_PATH = original_bak

    def test_main_exits_without_api_key(self, texture_png, backup_png, monkeypatch):
        monkeypatch.delenv("GEMINI_API_KEY", raising=False)
        import generate_texture

        original_tex = generate_texture.TEXTURE_PATH
        original_bak = generate_texture.BACKUP_PATH
        generate_texture.TEXTURE_PATH = texture_png
        generate_texture.BACKUP_PATH = backup_png

        result = generate_texture.main()

        assert result is None

        generate_texture.TEXTURE_PATH = original_tex
        generate_texture.BACKUP_PATH = original_bak

    def test_main_exits_without_texture(self, temp_dir, gemini_api_key, monkeypatch):
        monkeypatch.chdir(temp_dir)
        import generate_texture

        original_tex = generate_texture.TEXTURE_PATH
        original_bak = generate_texture.BACKUP_PATH
        generate_texture.TEXTURE_PATH = temp_dir / "runtime" / "nonexistent.png"
        generate_texture.BACKUP_PATH = temp_dir / "runtime" / "nonexistent_backup.png"

        result = generate_texture.main()

        assert result is None

        generate_texture.TEXTURE_PATH = original_tex
        generate_texture.BACKUP_PATH = original_bak
