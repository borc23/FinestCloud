export class DetectionClient {
  async detectRoofs(base64Image, bounds = null) {
    const requestBody = {
      image: base64Image
    };
    
    if (bounds) {
      requestBody.bounds = bounds;
    }
    
    const response = await fetch('/detect_image', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
      throw new Error('Network response was not ok');
    }

    const data = await response.json();
    console.log('Detection response: ', data);
    if (!data.success) {
      throw new Error(data.error || 'Detection failed');
    }

    return data.roofs;
  }
  
  imageToBase64(image) {
    return new Promise((resolve) => {
      const canvas = document.createElement('canvas');
      canvas.width = image.naturalWidth;
      canvas.height = image.naturalHeight;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(image, 0, 0);
      resolve(canvas.toDataURL('image/jpeg'));
    });
  }
}
