import { mockItems, mockCharacters, mockPlaces, mockGameState } from './mock-data'

// Mock DocumentSnapshot
class MockDocumentSnapshot {
  private _exists: boolean
  private _data: any
  private _id: string

  constructor(exists: boolean, data: any, id: string) {
    this._exists = exists
    this._data = data
    this._id = id
  }

  exists() {
    return this._exists
  }

  data() {
    return this._data
  }

  get id() {
    return this._id
  }
}

// Mock DocumentReference
class MockDocumentReference {
  private _path: string
  private _id: string
  private _data: any

  constructor(path: string, id: string, data: any) {
    this._path = path
    this._id = id
    this._data = data
  }

  get id() {
    return this._id
  }

  async get() {
    return new MockDocumentSnapshot(
      this._data !== undefined,
      this._data,
      this._id
    )
  }
}

// Mock CollectionReference
class MockCollectionReference {
  private _path: string
  private _data: any

  constructor(path: string, data: any) {
    this._path = path
    this._data = data
  }

  doc(id?: string) {
    const docData = id ? this._data[id] : this._data['default']
    return new MockDocumentReference(this._path, id || 'default', docData)
  }
}

// Mock Firestore
class MockFirestore {
  private collections: {
    [key: string]: any
  }

  constructor() {
    this.collections = {
      'items': mockItems,
      'characters': mockCharacters,
      'places': mockPlaces,
      'gameStates': mockGameState
    }
  }

  collection(path: string) {
    return new MockCollectionReference(path, this.collections[path])
  }

  doc(path: string) {
    const [collectionPath, docId] = path.split('/')
    return this.collection(collectionPath).doc(docId)
  }
}

// Create and export mock Firebase instance
export const mockFirebase = {
  firestore: new MockFirestore()
} 