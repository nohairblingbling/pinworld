import { initializeApp } from 'firebase/app'
import { 
  getFirestore, 
  collection, 
  doc,
  addDoc, 
  updateDoc, 
  deleteDoc,
  onSnapshot,
  query,
  orderBy
} from 'firebase/firestore'
import { 
  getAuth, 
  signInWithEmailAndPassword, 
  onAuthStateChanged 
} from 'firebase/auth'
import { ref, onUnmounted } from 'vue'

// Firebase 配置
const firebaseConfig = {
  apiKey: "AIzaSyCig7dhzB6wTi0eSj4snIwFjILPZEp2pTk",
  authDomain: "world-11a55.firebaseapp.com",
  projectId: "world-11a55",
  storageBucket: "world-11a55.firebasestorage.app",
  messagingSenderId: "465578031550",
  appId: "1:465578031550:web:9b9dc00e3d521e0ae4a1ef"
}

// 初始化 Firebase
const app = initializeApp(firebaseConfig)
const db = getFirestore(app)
const auth = getAuth(app)

// 地图钉集合引用
const pinsCollection = collection(db, 'pins')

export function useFirebase() {
  const pins = ref([])
  const loading = ref(true)
  const error = ref(null)
  
  // 用户状态
  const user = ref(null)

  // 监听Auth状态
  onAuthStateChanged(auth, (currentUser) => {
    user.value = currentUser
  })

  // 登录方法
  async function login(email, password) {
    try {
      await signInWithEmailAndPassword(auth, email, password)
    } catch (err) {
      console.error('Login failed:', err)
      throw err
    }
  }

  // 实时监听地图钉数据
  const unsubscribe = onSnapshot(
    query(pinsCollection, orderBy('createdAt', 'desc')),
    (snapshot) => {
      pins.value = snapshot.docs.map(doc => {
        const data = doc.data()
        // 确保 id 使用文档 ID，而不是数据中可能存在的 id 字段
        return {
          ...data,
          id: doc.id  // 放在最后，确保不被覆盖
        }
      })
      loading.value = false
    },
    (err) => {
      console.error('Firebase error:', err)
      error.value = err.message
      loading.value = false
    }
  )

  // 组件卸载时取消监听
  onUnmounted(() => {
    unsubscribe()
  })

  // 辅助函数：清理数据（转为纯对象，移除 undefined）
  function cleanData(data) {
    const raw = JSON.parse(JSON.stringify(data))
    // 移除 id 字段，不应该写入文档内容
    delete raw.id
    return raw
  }

  // 添加地图钉
  async function addPin(pinData) {
    try {
      const dbData = cleanData(pinData)
      const docRef = await addDoc(pinsCollection, {
        ...dbData,
        createdAt: new Date().toISOString()
      })
      return docRef.id
    } catch (err) {
      console.error('Error adding pin:', err)
      throw err
    }
  }

  // 更新地图钉
  async function updatePin(id, pinData) {
    if (!id) {
      console.error('updatePin called with missing id')
      return
    }
    try {
      const pinRef = doc(db, 'pins', id)
      const dbData = cleanData(pinData)
      
      await updateDoc(pinRef, {
        ...dbData,
        updatedAt: new Date().toISOString()
      })
    } catch (err) {
      console.error('Error updating pin:', err)
      throw err
    }
  }

  // 删除地图钉
  async function deletePin(id) {
    if (!id) {
      console.error('deletePin called with missing id')
      return
    }
    try {
      const pinRef = doc(db, 'pins', id)
      await deleteDoc(pinRef)
    } catch (err) {
      console.error('Error deleting pin:', err)
      throw err
    }
  }

  return {
    pins,
    user,
    login,
    loading,
    error,
    addPin,
    updatePin,
    deletePin
  }
}
