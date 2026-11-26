import React, { useState } from 'react'
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ActivityIndicator,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native'
import { RNCamera } from 'react-native-camera'

const API_URL = 'https://barprice-api-node.onrender.com/api/products'
const API_KEY = 'al_val_pmyvfFNkNPLNkDTYtWbEsZIOpceQzsb4'
const HEADERS = { 'x-api-key': API_KEY, 'Content-Type': 'application/json' }

// mode: 'scan' | 'result' | 'add' | 'edit'
export default function App() {
  const [mode, setMode] = useState('scan')
  const [cameraReady, setCameraReady] = useState(false)
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [success, setSuccess] = useState(null)
  const [product, setProduct] = useState(null)
  const [scannedBarcode, setScannedBarcode] = useState(null)
  const [editName, setEditName] = useState('')
  const [editPrice, setEditPrice] = useState('')
  const [saveError, setSaveError] = useState(null)

  const onBarCodeRead = async ({ data }) => {
    if (mode !== 'scan') return
    setMode('result')
    setScannedBarcode(data)
    setLoading(true)
    setProduct(null)
    setSaveError(null)
    setSuccess(null)
    try {
      const controller = new AbortController()
      const timeout = setTimeout(() => controller.abort(), 30000)
      const res = await fetch(`${API_URL}/${data}`, { headers: HEADERS, signal: controller.signal })
      clearTimeout(timeout)
      if (res.status === 404) {
        setMode('add')
        setEditName('')
        setEditPrice('')
      } else if (res.ok) {
        const json = await res.json()
        setProduct(json)
        setMode('result')
      } else {
        throw new Error('Error al consultar')
      }
    } catch (e) {
      const msg = e.name === 'AbortError' ? 'Servidor iniciando, intenta de nuevo.' : e.message
      setSaveError(msg)
      setMode('result')
    } finally {
      setLoading(false)
    }
  }

  const reset = () => {
    setMode('scan')
    setProduct(null)
    setScannedBarcode(null)
    setSaveError(null)
    setSuccess(null)
    setEditName('')
    setEditPrice('')
  }

  const startEdit = () => {
    setEditName(product.name)
    setEditPrice(String(product.price))
    setSaveError(null)
    setSuccess(null)
    setMode('edit')
  }

  const validateFields = () => {
    if (!editName.trim()) return 'El nombre no puede estar vacío'
    const p = parseFloat(editPrice)
    if (isNaN(p) || p < 0) return 'El precio debe ser un número válido'
    return null
  }

  const saveNew = async () => {
    const err = validateFields()
    if (err) { setSaveError(err); return }
    setSaving(true)
    setSaveError(null)
    try {
      const res = await fetch(API_URL, {
        method: 'POST',
        headers: HEADERS,
        body: JSON.stringify({ barcode: scannedBarcode, name: editName.trim(), price: parseFloat(editPrice) }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Error al guardar')
      setProduct(json)
      setSuccess('Producto guardado correctamente')
      setMode('result')
    } catch (e) {
      setSaveError(e.message)
    } finally {
      setSaving(false)
    }
  }

  const saveEdit = async () => {
    const err = validateFields()
    if (err) { setSaveError(err); return }
    setSaving(true)
    setSaveError(null)
    try {
      const res = await fetch(`${API_URL}/${scannedBarcode}`, {
        method: 'PUT',
        headers: HEADERS,
        body: JSON.stringify({ name: editName.trim(), price: parseFloat(editPrice) }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Error al guardar')
      setProduct(json)
      setSuccess('Producto actualizado correctamente')
      setMode('result')
    } catch (e) {
      setSaveError(e.message)
    } finally {
      setSaving(false)
    }
  }

  const renderPanel = () => {
    if (loading) {
      return <ActivityIndicator size="large" color="#007AFF" />
    }

    if (mode === 'result' && product) {
      return (
        <>
          {success && <Text style={styles.success}>✓ {success}</Text>}
          <Text style={styles.barcodeLabel}>Código: {product.barcode}</Text>
          <Text style={styles.productName}>{product.name}</Text>
          <Text style={styles.price}>${product.price.toFixed(2)}</Text>
          <View style={styles.row}>
            <TouchableOpacity style={[styles.button, styles.buttonSecondary]} onPress={startEdit}>
              <Text style={styles.buttonText}>✏ Editar</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.button} onPress={reset}>
              <Text style={styles.buttonText}>Escanear otro</Text>
            </TouchableOpacity>
          </View>
        </>
      )
    }

    if (mode === 'add' || mode === 'edit') {
      const isEdit = mode === 'edit'
      return (
        <ScrollView contentContainerStyle={styles.formContainer} keyboardShouldPersistTaps="handled">
          <Text style={styles.formTitle}>
            {isEdit ? '✏ Editar producto' : '➕ Producto no encontrado'}
          </Text>
          <Text style={styles.barcodeLabel}>Código: {scannedBarcode}</Text>

          <Text style={styles.label}>Nombre</Text>
          <TextInput
            style={styles.input}
            value={editName}
            onChangeText={setEditName}
            placeholder="Ej: Arroz 1kg"
            placeholderTextColor="#666"
            autoFocus
            returnKeyType="next"
          />

          <Text style={styles.label}>Precio</Text>
          <TextInput
            style={styles.input}
            value={editPrice}
            onChangeText={setEditPrice}
            placeholder="Ej: 150.50"
            placeholderTextColor="#666"
            keyboardType="decimal-pad"
            returnKeyType="done"
            onSubmitEditing={isEdit ? saveEdit : saveNew}
          />

          {saveError && <Text style={styles.error}>⚠ {saveError}</Text>}

          <View style={styles.row}>
            <TouchableOpacity style={[styles.button, styles.buttonSecondary]} onPress={reset} disabled={saving}>
              <Text style={styles.buttonText}>Cancelar</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.button} onPress={isEdit ? saveEdit : saveNew} disabled={saving}>
              {saving
                ? <ActivityIndicator color="#fff" />
                : <Text style={styles.buttonText}>{isEdit ? 'Guardar cambios' : 'Agregar producto'}</Text>
              }
            </TouchableOpacity>
          </View>
        </ScrollView>
      )
    }

    if (saveError) {
      return (
        <>
          <Text style={styles.error}>⚠ {saveError}</Text>
          <TouchableOpacity style={styles.button} onPress={reset}>
            <Text style={styles.buttonText}>Intentar de nuevo</Text>
          </TouchableOpacity>
        </>
      )
    }

    return null
  }

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      {!cameraReady && (
        <View style={styles.cameraLoading}>
          <ActivityIndicator size="large" color="#007AFF" />
          <Text style={styles.cameraLoadingText}>Iniciando cámara...</Text>
        </View>
      )}
      <RNCamera
        style={styles.camera}
        onBarCodeRead={mode === 'scan' ? onBarCodeRead : undefined}
        onCameraReady={() => setCameraReady(true)}
        barCodeTypes={[RNCamera.Constants.BarCodeType.ean13, RNCamera.Constants.BarCodeType.ean8, RNCamera.Constants.BarCodeType.code128]}
        captureAudio={false}
        androidCameraPermissionOptions={{
          title: 'Permiso de cámara',
          message: 'Almacén Valentina necesita acceso a la cámara para escanear códigos de barras.',
          buttonPositive: 'Permitir',
          buttonNegative: 'Cancelar',
        }}
      >
        {mode === 'scan' && (
          <View style={styles.scanArea}>
            <View style={styles.scanBox} />
            <Text style={styles.hint}>Apunta al código de barras</Text>
          </View>
        )}
      </RNCamera>

      <View style={styles.resultPanel}>
        {renderPanel()}
      </View>
    </KeyboardAvoidingView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  camera: { flex: 1 },
  cameraLoading: { ...StyleSheet.absoluteFillObject, justifyContent: 'center', alignItems: 'center', backgroundColor: '#000', zIndex: 10 },
  cameraLoadingText: { color: '#fff', marginTop: 12, fontSize: 14 },
  scanArea: { flex: 1, justifyContent: 'center', alignItems: 'center', marginBottom: 220 },
  scanBox: { width: 250, height: 150, borderWidth: 2, borderColor: '#007AFF', borderRadius: 12 },
  hint: { color: '#fff', fontSize: 14, marginTop: 16 },
  resultPanel: {
    position: 'absolute',
    bottom: 0,
    width: '100%',
    minHeight: 220,
    backgroundColor: 'rgba(0,0,0,0.92)',
    padding: 24,
    paddingBottom: 48,
    alignItems: 'center',
    justifyContent: 'center',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  barcodeLabel: { color: '#888', fontSize: 12, marginBottom: 4 },
  productName: { color: '#fff', fontSize: 20, fontWeight: '600', marginBottom: 8, textAlign: 'center' },
  price: { color: '#4CAF50', fontSize: 52, fontWeight: 'bold', marginBottom: 16 },
  success: { color: '#4CAF50', fontSize: 14, marginBottom: 12 },
  error: { color: '#f44336', fontSize: 14, marginBottom: 12, textAlign: 'center' },
  row: { flexDirection: 'row', gap: 12, marginTop: 4 },
  button: { backgroundColor: '#007AFF', paddingHorizontal: 24, paddingVertical: 12, borderRadius: 8, minWidth: 120, alignItems: 'center' },
  buttonSecondary: { backgroundColor: '#444' },
  buttonText: { color: '#fff', fontSize: 15, fontWeight: '600' },
  formContainer: { width: '100%', alignItems: 'stretch' },
  formTitle: { color: '#fff', fontSize: 16, fontWeight: '700', marginBottom: 12, textAlign: 'center' },
  label: { color: '#aaa', fontSize: 13, marginBottom: 4, marginTop: 8 },
  input: {
    backgroundColor: '#222',
    color: '#fff',
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#444',
  },
})
