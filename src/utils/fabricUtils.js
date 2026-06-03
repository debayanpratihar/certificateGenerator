import { fabric } from 'fabric';

export const createTextbox = (text, options = {}) => new fabric.Textbox(text, { left: 100, top: 100, fontSize: 30, fontFamily: 'Arial', fill: '#000', width: 200, ...options });

export const createImageFromURL = (url) => new Promise((resolve, reject) => fabric.Image.fromURL(url, resolve, reject));

export const scaleImageToFit = (img, canvasWidth, canvasHeight) => { const scale = Math.min(canvasWidth / img.width, canvasHeight / img.height); img.scale(scale); img.set({ left: (canvasWidth - img.width * scale) / 2, top: (canvasHeight - img.height * scale) / 2 }); return img; };

export const exportCanvasAsBlob = (canvas, format = 'png', quality = 1) => new Promise(resolve => canvas.getElement().toBlob(resolve, format === 'jpg' ? 'image/jpeg' : 'image/png', quality));