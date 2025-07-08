export async function getColorPalette(model = "default", input = [null, null, null, null, null]) {
  try {
    const response = await fetch('/api/colormind', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ model, input }),
    });

    const data = await response.json();
    return data.result; // [[r,g,b], [r,g,b], ...]
  } catch (err) {
    console.error('Error fetching color palette:', err);
    return [];
  }
}
