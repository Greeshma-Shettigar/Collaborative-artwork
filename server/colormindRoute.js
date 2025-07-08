// server/colormindRoute.js
import express from 'express';
import axios from 'axios';
const router = express.Router();

router.post('/colormind', async (req, res) => {
  try {
    const { model, input } = req.body;

    const response = await axios.post('http://colormind.io/api/', {
      model: model || 'default',
      input: input || [null, null, null, null, null],
    });

    res.json(response.data); // sends { result: [...] }
  } catch (err) {
    console.error('Colormind API error:', err.message);
    res.status(500).json({ error: 'Failed to fetch color palette' });
  }
});

module.exports = router;
