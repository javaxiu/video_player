import os

# ================== 扩展后的文件头字典 ==================
IMAGE_HEADERS = {
    b'\xFF\xD8\xFF': '.jpg',           # JPEG/JFIF
    b'\x89\x50\x4E\x47\x0D\x0A\x1A\x0A': '.png',
    b'\x47\x49\x46\x38\x37\x61': '.gif',  # GIF87a
    b'\x47\x49\x46\x38\x39\x61': '.gif',  # GIF89a
    b'\x42\x4D': '.bmp',               # BMP
    b'II\x2A\x00': '.tiff',            # TIFF little-endian
    b'MM\x00\x2A': '.tiff',            # TIFF big-endian
    b'\x00\x00\x01\x00': '.ico',       # ICO 1
    b'\x00\x00\x02\x00': '.ico',       # ICO 2
    b'RIFF': '.webp',                  # WebP 以 RIFFxxxxWEBP 开头
    b'ftypheic': '.heic',              # HEIC/HEIF
    b'ftypmif1': '.heic',              # HEIF
    b'ftypheix': '.heic',
    b'ftyphevc': '.heic',
    b'ftyphevx': '.heic',
}

# 对“非固定前缀”格式做额外判断
def guess_extension(data: bytes) -> str:
    """先走固定前缀，再走特殊规则"""
    for sig, ext in IMAGE_HEADERS.items():
        if data.startswith(sig):
            return ext
    # WebP 的完整签名是 RIFF....WEBP
    if data.startswith(b'RIFF') and len(data) > 11 and data[8:12] == b'WEBP':
        return '.webp'
    # HEIC/HEIF 的签名在偏移 4 开始
    if len(data) > 12:
        ftyp = data[4:12]
        if ftyp in (b'ftypheic', b'ftypmif1', b'ftypheix', b'ftyphevc', b'ftyphevx'):
            return '.heic'
    return ''

# ================== 解密 & 转换 ==================
def decrypt_dat_file(dat_path: str, output_dir: str):
    with open(dat_path, 'rb') as f:
        first_byte = f.read(1)
        f.seek(0)
        data = bytearray(f.read())

    # 计算异或密钥（按最常见 JPG 头 0xFF 推算）
    xor_key = first_byte[0] ^ 0xFF
    decrypted = bytes(b ^ xor_key for b in data)

    ext = guess_extension(decrypted)
    if not ext:
        print(f'⚠️  无法识别格式：{dat_path}')
        return

    out_name = os.path.basename(dat_path) + ext
    out_path = os.path.join(output_dir, out_name)
    os.makedirs(output_dir, exist_ok=True)
    with open(out_path, 'wb') as wf:
        wf.write(decrypted)
    print(f'✅ 已转换：{dat_path} -> {out_path}')

# ================== 批量入口 ==================
def batch_convert(input_dir: str, output_dir: str):
    for fname in os.listdir(input_dir):
        full_path = os.path.join(input_dir, fname)
        if os.path.isdir(full_path):
            batch_convert(full_path, output_dir)
        elif fname.lower().endswith('.dat'):
            decrypt_dat_file(full_path, output_dir)
        # if fname.lower().endswith('.dat'):
        #     decrypt_dat_file(os.path.join(input_dir, fname), output_dir)

# ================== 直接运行 ==================
if __name__ == '__main__':
    input_folder  = r'I:\应用中心\WeChat Files\kayuLaw\FileStorage\Image\2020-08'
    output_folder = r'H:\08'
    if not os.path.exists(output_folder):
        os.makedirs(output_folder)
    batch_convert(input_folder, output_folder)
    batch_convert(input_folder, output_folder)