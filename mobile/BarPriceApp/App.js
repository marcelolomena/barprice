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
  FlatList,
  Modal,
} from 'react-native'
import { RNCamera } from 'react-native-camera'

const API_URL = 'https://barprice-api-node.onrender.com/api/products'
const API_KEY = 'al_val_pmyvfFNkNPLNkDTYtWbEsZIOpceQzsb4'
const HEADERS = { 'x-api-key': API_KEY, 'Content-Type': 'application/json' }
const LIST_LIMIT = 10

export default function App() {
  const [mode, setMode] = useState('scan')
  const [cameraActive, setCameraActive] = useState(false)
  const [cameraReady, setCameraReady] = useState(false)
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [success, setSuccess] = useState(null)
  const [product, setProduct] = useState(null)
  const [scannedBarcode, setScannedBarcode] = useState(null)
  const [editName, setEditName] = useState('')
  const [editPrice, setEditPrice] = useState('')
  const [saveError, setSaveError] = useState(null)
  // List
  const [showList, setShowList] = useState(false)
  const [productList, setProductList] = useState([])
  const [listLoading, setListLoading] = useState(false)
  const [listLoadingMore, setListLoadingMore] = useState(false)
  const [listError, setListError] = useState(null)
  const [listTotal, setListTotal] = useState(0)
  const [listHasMore, setListHasMore] = useState(true)
  const [listOffset, setListOffset] = useState(0)
  // Search
  const [showSearch, setShowSearch] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState([])
  const [searchLoading, setSearchLoading] = useState(false)
  // Sync
  const [syncing, setSyncing] = useState(false)
  const [syncStatus, setSyncStatus] = useState(null)
  // Edit price from list
  const [showEditPrice, setShowEditPrice] = useState(false)
  const [editPriceProduct, setEditPriceProduct] = useState(null)
  const [editPriceValue, setEditPriceValue] = useState('')
  const [editPriceSaving, setEditPriceSaving] = useState(false)
  const [editPriceError, setEditPriceError] = useState(null)
  const [editPriceSuccess, setEditPriceSuccess] = useState(false)

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

  const toggleCamera = () => {
    if (cameraActive) {
      setCameraActive(false)
      setCameraReady(false)
      reset()
    } else {
      setCameraActive(true)
    }
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

  const fetchProducts = async (offset, isReset = false) => {
    if (isReset) setListLoading(true)
    else setListLoadingMore(true)
    try {
      const res = await fetch(`${API_URL}?limit=${LIST_LIMIT}&offset=${offset}`, { headers: HEADERS })
      if (!res.ok) throw new Error('Error al cargar productos')
      const json = await res.json()
      setProductList(prev => isReset ? json.products : [...prev, ...json.products])
      setListTotal(json.total)
      setListHasMore(json.hasMore)
      setListOffset(offset + LIST_LIMIT)
    } catch (e) {
      setListError(e.message)
    } finally {
      setListLoading(false)
      setListLoadingMore(false)
    }
  }

  const openList = async () => {
    setShowList(true)
    setProductList([])
    setListOffset(0)
    setListHasMore(true)
    setListError(null)
    await fetchProducts(0, true)
  }

  const loadMore = () => {
    if (!listLoadingMore && listHasMore) fetchProducts(listOffset)
  }

  const openSearch = () => {
    setShowSearch(true)
    setSearchQuery('')
    setSearchResults([])
  }

  const searchProducts = async (query) => {
    setSearchQuery(query)
    if (query.trim().length < 3) { setSearchResults([]); return }
    setSearchLoading(true)
    try {
      const res = await fetch(`${API_URL}?limit=200&offset=0`, { headers: HEADERS })
      if (!res.ok) throw new Error()
      const json = await res.json()
      const q = query.toLowerCase()
      setSearchResults(json.products.filter(p => p.name.toLowerCase().includes(q)))
    } catch {
      setSearchResults([])
    } finally {
      setSearchLoading(false)
    }
  }

  const syncServer = async () => {
    setSyncing(true)
    setSyncStatus(null)
    try {
      const res = await fetch(`${API_URL}?limit=1&offset=0`, { headers: HEADERS })
      setSyncStatus(res.ok ? 'ok' : 'error')
    } catch {
      setSyncStatus('error')
    } finally {
      setSyncing(false)
      setTimeout(() => setSyncStatus(null), 3000)
    }
  }

  const openEditPrice = (item) => {
    setEditPriceProduct(item)
    setEditPriceValue(String(item.price))
    setEditPriceError(null)
    setEditPriceSuccess(false)
    setShowEditPrice(true)
  }

  const saveEditPrice = async () => {
    const p = parseFloat(editPriceValue)
    if (isNaN(p) || p < 0) { setEditPriceError('Precio inválido'); return }
    setEditPriceSaving(true)
    setEditPriceError(null)
    try {
      const res = await fetch(`${API_URL}/${editPriceProduct.barcode}`, {
        method: 'PUT',
        headers: HEADERS,
        body: JSON.stringify({ name: editPriceProduct.name, price: p }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Error al guardar')
      setEditPriceSuccess(true)
      setProductList(prev => prev.map(x => x.barcode === editPriceProduct.barcode ? { ...x, price: p } : x))
      setSearchResults(prev => prev.map(x => x.barcode === editPriceProduct.barcode ? { ...x, price: p } : x))
      setTimeout(() => setShowEditPrice(false), 1000)
    } catch (e) {
      setEditPriceError(e.message)
    } finally {
      setEditPriceSaving(false)
    }
  }

  const renderProductRow = (item, index) => (
    <View style={styles.listItem}>
      <Text style={styles.listIndex}>{index + 1}.</Text>
      <Text style={styles.listName} numberOfLines={1}>{item.name}</Text>
      <Text style={styles.listPrice}>${item.price.toFixed(2)}</Text>
      <TouchableOpacity style={styles.editPriceBtn} onPress={() => openEditPrice(item)}>
        <Text style={styles.editPriceIcon}>✏️</Text>
      </TouchableOpacity>
    </View>
  )

  const renderPanel = () => {
    if (loading) return <ActivityIndicator size="large" color="#007AFF" />

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

  const toolbar = (
    <View style={styles.toolbar}>
      <TouchableOpacity style={[styles.toolbarBtn, cameraActive && styles.toolbarBtnActive]} onPress={toggleCamera}>
        <Text style={styles.toolbarIcon}>{cameraActive ? '⏹' : '📷'}</Text>
        <Text style={styles.toolbarLabel}>{cameraActive ? 'Detener' : 'Escanear'}</Text>
      </TouchableOpacity>
      <TouchableOpacity style={styles.toolbarBtn} onPress={openList}>
        <Text style={styles.toolbarIcon}>📋</Text>
        <Text style={styles.toolbarLabel}>Listado</Text>
      </TouchableOpacity>
      <TouchableOpacity style={styles.toolbarBtn} onPress={openSearch}>
        <Text style={styles.toolbarIcon}>🔍</Text>
        <Text style={styles.toolbarLabel}>Buscar</Text>
      </TouchableOpacity>
      <TouchableOpacity style={styles.toolbarBtn} onPress={syncServer} disabled={syncing}>
        {syncing
          ? <ActivityIndicator color="#fff" size="small" />
          : <Text style={styles.toolbarIcon}>
              {syncStatus === 'ok' ? '✅' : syncStatus === 'error' ? '❌' : '🔄'}
            </Text>
        }
        <Text style={styles.toolbarLabel}>Sincronizar</Text>
      </TouchableOpacity>
    </View>
  )

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      {cameraActive ? (
        <>
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
            {toolbar}
          </RNCamera>
          {mode !== 'scan' && (
            <View style={styles.resultPanel}>
              {renderPanel()}
            </View>
          )}
        </>
      ) : (
        <View style={styles.welcome}>
          {toolbar}
          <View style={styles.welcomeContent}>
            <Text style={styles.welcomeIcon}>🛒</Text>
            <Text style={styles.welcomeTitle}>Almacén Valentina</Text>
            <Text style={styles.welcomeHint}>Presioná 📷 Escanear para comenzar</Text>
          </View>
        </View>
      )}

      {/* Modal Listado */}
      <Modal visible={showList} animationType="slide" onRequestClose={() => setShowList(false)}>
        <View style={styles.listContainer}>
          <View style={styles.listHeader}>
            <Text style={styles.listTitle}>Listado de productos</Text>
            <TouchableOpacity onPress={() => setShowList(false)} style={styles.closeButton}>
              <Text style={styles.closeButtonText}>✕</Text>
            </TouchableOpacity>
          </View>
          {listLoading && <ActivityIndicator size="large" color="#007AFF" style={{ marginTop: 40 }} />}
          {listError && <Text style={styles.listError}>⚠ {listError}</Text>}
          {!listLoading && !listError && (
            <>
              <Text style={styles.listCount}>Total: {listTotal} productos</Text>
              <FlatList
                data={productList}
                keyExtractor={(item, index) => item.barcode || String(index)}
                renderItem={({ item, index }) => renderProductRow(item, index)}
                ItemSeparatorComponent={() => <View style={styles.separator} />}
                onEndReached={loadMore}
                onEndReachedThreshold={0.3}
                ListFooterComponent={() => listLoadingMore
                  ? <ActivityIndicator color="#007AFF" style={{ margin: 16 }} />
                  : !listHasMore && productList.length > 0
                    ? <Text style={styles.listEnd}>— Fin del listado —</Text>
                    : null
                }
              />
            </>
          )}
        </View>
      </Modal>

      {/* Modal Buscar */}
      <Modal visible={showSearch} animationType="slide" onRequestClose={() => setShowSearch(false)}>
        <View style={styles.listContainer}>
          <View style={styles.listHeader}>
            <Text style={styles.listTitle}>Buscar producto</Text>
            <TouchableOpacity onPress={() => setShowSearch(false)} style={styles.closeButton}>
              <Text style={styles.closeButtonText}>✕</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.searchInputContainer}>
            <TextInput
              style={styles.searchInput}
              value={searchQuery}
              onChangeText={searchProducts}
              placeholder="Nombre del producto..."
              placeholderTextColor="#666"
              autoFocus
            />
          </View>
          {searchLoading && <ActivityIndicator color="#007AFF" style={{ marginTop: 20 }} />}
          <FlatList
            data={searchResults}
            keyExtractor={(item, index) => item.barcode || String(index)}
            renderItem={({ item, index }) => renderProductRow(item, index)}
            ItemSeparatorComponent={() => <View style={styles.separator} />}
            ListEmptyComponent={() => searchQuery.length > 0 && !searchLoading
              ? <Text style={styles.listEnd}>{searchQuery.length < 3 ? 'Escribe al menos 3 letras' : 'Sin resultados'}</Text>
              : null
            }
          />
        </View>
      </Modal>

      {/* Modal Editar Precio */}
      <Modal visible={showEditPrice} animationType="fade" transparent onRequestClose={() => setShowEditPrice(false)}>
        <View style={styles.editPriceOverlay}>
          <View style={styles.editPriceModal}>
            <Text style={styles.editPriceTitle}>Editar precio</Text>
            <Text style={styles.editPriceName} numberOfLines={2}>{editPriceProduct?.name}</Text>
            <TextInput
              style={styles.editPriceInput}
              value={editPriceValue}
              onChangeText={setEditPriceValue}
              keyboardType="decimal-pad"
              placeholder="Nuevo precio"
              placeholderTextColor="#666"
              autoFocus
            />
            {editPriceError && <Text style={styles.error}>⚠ {editPriceError}</Text>}
            {editPriceSuccess && <Text style={styles.success}>✓ Guardado</Text>}
            <View style={styles.row}>
              <TouchableOpacity style={[styles.button, styles.buttonSecondary]} onPress={() => setShowEditPrice(false)} disabled={editPriceSaving}>
                <Text style={styles.buttonText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.button} onPress={saveEditPrice} disabled={editPriceSaving}>
                {editPriceSaving
                  ? <ActivityIndicator color="#fff" />
                  : <Text style={styles.buttonText}>Guardar</Text>
                }
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </KeyboardAvoidingView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  camera: { flex: 1 },
  cameraLoading: { ...StyleSheet.absoluteFillObject, justifyContent: 'center', alignItems: 'center', backgroundColor: '#000', zIndex: 10 },
  cameraLoadingText: { color: '#fff', marginTop: 12, fontSize: 14 },
  welcome: { flex: 1, backgroundColor: '#111' },
  welcomeContent: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 16 },
  welcomeIcon: { fontSize: 64 },
  welcomeTitle: { color: '#fff', fontSize: 24, fontWeight: '700' },
  welcomeHint: { color: '#888', fontSize: 15 },
  scanArea: { flex: 1, justifyContent: 'center', alignItems: 'center', marginBottom: 220 },
  scanBox: { width: 250, height: 150, borderWidth: 2, borderColor: '#007AFF', borderRadius: 12 },
  hint: { color: '#fff', fontSize: 14, marginTop: 16 },
  toolbar: {
    position: 'absolute',
    top: 16,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 12,
    paddingHorizontal: 16,
  },
  toolbarBtn: {
    backgroundColor: 'rgba(0,0,0,0.55)',
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 16,
    alignItems: 'center',
  },
  toolbarBtnActive: {
    backgroundColor: 'rgba(244,67,54,0.75)',
  },
  toolbarIcon: { fontSize: 20 },
  toolbarLabel: { color: '#fff', fontSize: 11, marginTop: 2 },
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
  listContainer: { flex: 1, backgroundColor: '#111' },
  listHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    paddingTop: 48,
    backgroundColor: '#1a1a1a',
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  listTitle: { color: '#fff', fontSize: 18, fontWeight: '700' },
  closeButton: { padding: 8 },
  closeButtonText: { color: '#fff', fontSize: 20, fontWeight: '700' },
  listCount: { color: '#888', fontSize: 13, paddingHorizontal: 16, paddingVertical: 10 },
  listItem: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12 },
  listIndex: { color: '#666', fontSize: 13, width: 32 },
  listName: { color: '#fff', fontSize: 15, flex: 1, marginRight: 8 },
  listPrice: { color: '#4CAF50', fontSize: 15, fontWeight: '600', marginRight: 8 },
  editPriceBtn: { padding: 4 },
  editPriceIcon: { fontSize: 16 },
  separator: { height: 1, backgroundColor: '#222', marginLeft: 16 },
  listError: { color: '#f44336', textAlign: 'center', marginTop: 40, fontSize: 14 },
  listEnd: { color: '#555', textAlign: 'center', padding: 16, fontSize: 13 },
  searchInputContainer: { padding: 12, backgroundColor: '#1a1a1a' },
  searchInput: {
    backgroundColor: '#222',
    color: '#fff',
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#444',
  },
  editPriceOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  editPriceModal: {
    backgroundColor: '#1a1a1a',
    borderRadius: 16,
    padding: 24,
    width: '100%',
  },
  editPriceTitle: { color: '#fff', fontSize: 18, fontWeight: '700', marginBottom: 8 },
  editPriceName: { color: '#aaa', fontSize: 14, marginBottom: 16 },
  editPriceInput: {
    backgroundColor: '#222',
    color: '#fff',
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 20,
    borderWidth: 1,
    borderColor: '#444',
    marginBottom: 16,
  },
})
