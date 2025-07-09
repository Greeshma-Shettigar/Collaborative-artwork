export async function getColorPalette(model = "default", input = [[44,43,44],[90,83,82],"N","N","N"]) {
  try {
    const response = await fetch('https://collaborative-artwork-gf2e.onrender.com/api/colormind', {
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
