const functions = require('firebase-functions')
const admin = require('firebase-admin')

admin.initializeApp()
const db = admin.firestore()

exports.getProduct = functions.https.onRequest(async (req, res) => {
  res.set('Access-Control-Allow-Origin', '*')

  const barcode = req.path.replace('/', '').trim()

  if (!barcode) {
    return res.status(400).json({ error: 'Barcode requerido' })
  }

  try {
    const doc = await db.collection('products').doc(barcode).get()
    if (!doc.exists) {
      return res.status(404).json({ error: 'Producto no encontrado' })
    }
    return res.json({ barcode, ...doc.data() })
  } catch (e) {
    return res.status(500).json({ error: e.message })
  }
})
