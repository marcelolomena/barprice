import React, { useState, useEffect } from 'react'
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ActivityIndicator,
  PermissionsAndroid,
  Platform,
} from 'react-native'
import { Camera, useCameraDevices, useFrameProcessor } from 'react-native-vision-camera'
import { scanBarcodes, BarcodeFormat } from 'vision-camera-code-scanner'
import { runOnJS } from 'react-native-reanimated'

const API_URL = 'http://192.168.100.79:8080/api/products'

export default function App() {
  const [hasPermission, setHasPermission] = useState(false)
  const [scanning, setScanning] = useState(true)
  const [loading, setLoading] = useState(false)
  const [product, setProduct] = useState(null)
  const [error, setError] = useState(null)

  const devices = useCameraDevices()
  const device = devices.back

  useEffect(() => {
    requestCameraPermission()
  }, [])

  const requestCameraPermission = async () => {
    if (Platform.OS === 'android') {
      const granted = await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.CAMERA)
      setHasPermission(granted === PermissionsAndroid.RESULTS.GRANTED)
    } else {
      const status = await Camera.requestCameraPermission()
      setHasPermission(status === 'authorized')
    }
  }

  const fetchPrice = async (barcode) => {
    if (!scanning) return
    setScanning(false)
    setLoading(true)
    setError(null)
    setProduct(null)
    try {
      const res = await fetch(`${API_URL}/${barcode}`)
      if (!res.ok) throw new Error('Producto no encontrado')
      const data = await res.json()
      setProduct(data)
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  const frameProcessor = useFrameProcessor((frame) => {
    'worklet'
    const barcodes = scanBarcodes(frame, [BarcodeFormat.ALL_FORMATS])
    if (barcodes.length > 0) {
      runOnJS(fetchPrice)(barcodes[0].displayValue)
    }
  }, [scanning])

  const reset = () => {
    setScanning(true)
    setProduct(null)
    setError(null)
  }

  if (!hasPermission) {
    return (
      <View style={styles.centered}>
        <Text style={styles.hint}>Se requiere permiso de cámara</Text>
        <TouchableOpacity style={styles.button} onPress={requestCameraPermission}>
          <Text style={styles.buttonText}>Conceder permiso</Text>
        </TouchableOpacity>
      </View>
    )
  }

  if (!device) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.hint}>Iniciando cámara...</Text>
      </View>
    )
  }

  return (
    <View style={styles.container}>
      <Camera
        style={StyleSheet.absoluteFill}
        device={device}
        isActive={scanning}
        frameProcessor={frameProcessor}
        frameProcessorFps={5}
      />

      {/* Visor de escaneo */}
      <View style={styles.overlay}>
        <View style={styles.scanBox} />
        {scanning && <Text style={styles.hint}>Apunta al código de barras</Text>}
      </View>

      {/* Panel de resultado */}
      <View style={styles.resultPanel}>
        {loading && <ActivityIndicator size="large" color="#007AFF" />}

        {error && (
          <>
            <Text style={styles.error}>⚠ {error}</Text>
            <TouchableOpacity style={styles.button} onPress={reset}>
              <Text style={styles.buttonText}>Intentar de nuevo</Text>
            </TouchableOpacity>
          </>
        )}

        {product && !loading && (
          <>
            <Text style={styles.barcode}>Código: {product.barcode}</Text>
            <Text style={styles.productName}>{product.name}</Text>
            <Text style={styles.price}>${product.price.toFixed(2)}</Text>
            <TouchableOpacity style={styles.button} onPress={reset}>
              <Text style={styles.buttonText}>Escanear otro</Text>
            </TouchableOpacity>
          </>
        )}
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#000',
  },
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 200,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scanBox: {
    width: 250,
    height: 150,
    borderWidth: 2,
    borderColor: '#007AFF',
    borderRadius: 12,
    backgroundColor: 'transparent',
  },
  hint: {
    color: '#fff',
    fontSize: 14,
    marginTop: 16,
    textAlign: 'center',
  },
  resultPanel: {
    position: 'absolute',
    bottom: 0,
    width: '100%',
    minHeight: 200,
    backgroundColor: 'rgba(0,0,0,0.85)',
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  barcode: {
    color: '#888',
    fontSize: 12,
    marginBottom: 4,
  },
  productName: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 8,
    textAlign: 'center',
  },
  price: {
    color: '#4CAF50',
    fontSize: 52,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  error: {
    color: '#f44336',
    fontSize: 16,
    marginBottom: 16,
    textAlign: 'center',
  },
  button: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 32,
    paddingVertical: 12,
    borderRadius: 8,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
})
