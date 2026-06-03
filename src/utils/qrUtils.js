import QRCode from 'qrcode';

export const generateQRCodeDataURL = async (text, size = 300) => {
  return await QRCode.toDataURL(text, { width: size, margin: 2, color: { dark: '#000', light: '#FFF' } });
};