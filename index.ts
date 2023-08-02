// useLibs
// noPage

import AsyncStorage from '@react-native-async-storage/async-storage';
import _global from 'esoftplay/_global';
import esp from 'esoftplay/esp';
import { initializeApp } from 'firebase/app';
import { initializeAuth, signInAnonymously } from 'firebase/auth';
import { getReactNativePersistence } from 'firebase/auth/react-native';
import { FieldPath, OrderByDirection, WhereFilterOp, addDoc, collection, deleteDoc, doc, getDoc, getDocs, initializeFirestore, limit, onSnapshot, orderBy, query, setDoc, startAfter, updateDoc, where, writeBatch } from 'firebase/firestore';

export interface DataId {
  id: string,
  data: any
}

export type id = string
let lastVisible: any = null

export interface updateValue {
  key: string,
  value: string
}

function conditionIsNotValid(where: any[]): boolean {
  return where[2] == undefined || where[0] == undefined
}

function castPathToString(path: any[]) {
  const strings = path?.map?.(x => String(x)) || []
  return strings
}

const firestoreSettings = {
  useFetchStreams: false
}

const Firestore = {
  init() {
    if (esp.config().hasOwnProperty('firebase')) {
      if (esp.config('firebase').hasOwnProperty('projectId')) {
        if (!_global.firebaseApp) {
          _global.firebaseApp = initializeApp(esp.config("firebase"), "firestore-init");
          const appAuth = initializeAuth(_global.firebaseApp, { persistence: getReactNativePersistence(AsyncStorage) })
          signInAnonymously(appAuth);
        }
      } else {
        throw "ERROR : firebase projectId not found in config.json"
      }
    } else {
      throw "ERROR : firebase not found in config.json"
    }
  },
  db() {
    if (!_global.firebaseFirestore)
      _global.firebaseFirestore = initializeFirestore(_global.firebaseApp, {
        ...firestoreSettings,
        experimentalForceLongPolling: true
      })
    return _global.firebaseFirestore
  },
  add: {
    doc(path: string[], value: any, cb: () => void, err?: (error: any) => void) {
      const fixedPath = castPathToString(path)
      if (fixedPath.length % 2 > 0) {
        console.warn("path untuk akses Doc data tidak boleh berhenti di Collection [Firestore.add.doc]")
        return
      }
      const colRef = doc(Firestore.db(), ...fixedPath)
      setDoc(colRef, value).then((snap) => {
        cb()
      }).catch(err)
    },
    collection(path: string[], value: any, cb: (dt: any) => void, err?: (error: any) => void) {
      const fixedPath = castPathToString(path)

      if (fixedPath.length % 2 == 0) {
        console.warn("path untuk akses Collection data tidak boleh berhenti di Doc [Firestore.add.collection]")
        return
      }
      //@ts-ignore
      const colRef = collection(Firestore.db(), ...fixedPath)
      addDoc(colRef, value).then((snap) => {
        cb({ id: snap?.id })
      }).catch(err)
    }
  },
  delete: {
    doc(path: string[], cb: () => void, err?: (error: any) => void) {
      const fixedPath = castPathToString(path)
      if (fixedPath.length % 2 > 0) {
        console.warn("path untuk akses Doc data tidak boleh berhenti di Collection [Firestore.delete.doc]")
        return
      }
      const colRef = doc(Firestore.db(), ...fixedPath)
      deleteDoc(colRef).then((snap) => {
        cb()
      }).catch(err)
    },
    batchDoc(rootPath: string[], docIds: string[], callback?: (res: any) => void, error?: (error: any) => void) {
      const fixedPath = castPathToString(rootPath)
      if (fixedPath.length % 2 == 0) {
        console.warn("path untuk akses deleteBatch cukup berhenti di Collection [Firestore.delete.batchDoc]")
        return
      }
      const batch = writeBatch(Firestore.db());
      docIds.forEach((id) => {
        const laRef = doc(Firestore.db(), ...fixedPath, id);
        batch.delete(laRef);
      })
      batch.commit().then((result) => {
        callback && callback(result)
      }).catch((er) => {
        error && error(er)
      })
    },
  },
  get: {
    doc(path: string[], condition: [fieldPath?: string | FieldPath, opStr?: WhereFilterOp, value?: unknown], cb: (arr: DataId) => void, err?: (error: any) => void) {
      const fixedPath = castPathToString(path)
      if (fixedPath.length % 2 > 0) {
        console.warn("path untuk akses Doc data tidak boleh berhenti di Collection [Firestore.get.doc]")
        return
      }
      //@ts-ignore
      const colRef = doc(Firestore.db(), ...fixedPath)
      //@ts-ignore
      const fRef = (!condition || condition.length < 3) ? colRef : query(colRef, where(...condition))
      //@ts-ignore
      getDoc(fRef).then((snap) => {
        cb({ data: snap.data(), id: snap.id })
      }).catch(err)
    },
    collectionWhereOrderBy(path: string[], condition: [fieldPath?: string | FieldPath, opStr?: WhereFilterOp, value?: unknown][], order_by: [fieldPath?: string | FieldPath, directionStr?: OrderByDirection | undefined][], cb: (arr: DataId[]) => void, err?: (error: any) => void) {
      const fixedPath = castPathToString(path)
      if (fixedPath.length % 2 == 0) {
        console.warn("path untuk akses Collection data tidak boleh berhenti di Doc [Firestore.get.collection]")
        return
      }
      //@ts-ignore
      const colRef = collection(Firestore.db(), ...fixedPath)
      let conditionsArray: any = []
      if (condition.length > 0) {
        condition.forEach((c) => {
          if (conditionIsNotValid(c)) {
            console.warn("condition tidak boleh undefined", fixedPath)
          } else {
            //@ts-ignore
            conditionsArray.push(where(...c))
          }
        })
      }
      let orderArray: any = []
      if (order_by.length > 0) {
        order_by.forEach((o) => {
          //@ts-ignore
          orderArray.push(orderBy(...o))
        })
      }
      // @ts-ignore
      // const fRef = (!condition || condition.length == 0) ? colRef : query(colRef, ...conditionsArray)
      const fRef = (condition && order_by) ? query(colRef, ...conditionsArray, ...orderArray)
        : condition ? query(colRef, ...conditionsArray)
          : order_by ? query(colRef, ...orderArray) : colRef

      let datas: any[] = []
      getDocs(fRef).then((snap) => {
        snap.docs.forEach((doc) => {
          datas.push({ data: doc.data(), id: doc.id })
        })
        cb(datas)
      }).catch(err)
    },
    collectionIds(path: string[], condition: [fieldPath?: string | FieldPath, opStr?: WhereFilterOp, value?: unknown][], cb: (arr: id[]) => void, err?: (error: any) => void) {
      const fixedPath = castPathToString(path)
      if (fixedPath.length % 2 == 0) {
        console.warn("path untuk akses Collection data tidak boleh berhenti di Doc [Firestore.get.collectionIds]")
        return
      }
      //@ts-ignore
      const colRef = collection(Firestore.db(), ...fixedPath)
      let conditionsArray: any = []
      if (condition.length > 0) {
        condition.forEach((c) => {
          if (conditionIsNotValid(c)) {
            console.warn("condition tidak boleh undefined", fixedPath)
          } else {
            //@ts-ignore
            conditionsArray.push(where(...c))
          }
        })
      }
      //@ts-ignore
      const fRef = conditionsArray.length > 0 ? query(colRef, ...conditionsArray) : colRef
      let datas: any[] = []
      getDocs(fRef).then((snap) => {
        snap.docs.forEach((doc) => {
          datas.push(doc.id)
        })
        cb(datas)
      }).catch(err)
    },
    collection(path: string[], cb: (arr: DataId[]) => void, err?: (error: any) => void) {
      Firestore.get.collectionWhereOrderBy(path, [], [], cb, err)
    },
    collectionWhere(path: string[], condition: [fieldPath?: string | FieldPath, opStr?: WhereFilterOp, value?: unknown][], cb: (arr: DataId[]) => void, err?: (error: any) => void) {
      Firestore.get.collectionWhereOrderBy(path, condition, [], cb, err)
    },
    collectionOrderBy(path: string[], order_by: [fieldPath?: string | FieldPath, directionStr?: OrderByDirection | undefined][], cb: (arr: DataId[]) => void, err?: (error: any) => void) {
      Firestore.get.collectionWhereOrderBy(path, [], order_by, cb, err)
    },
  },
  listen: {
    collection(path: string[], condition: [fieldPath?: string | FieldPath, opStr?: WhereFilterOp, value?: unknown][], order_by: [fieldPath?: string | FieldPath, directionStr?: OrderByDirection | undefined][], cb: (dt: any) => void, err?: (error: any) => void): () => void {
      const fixedPath = castPathToString(path)
      if (fixedPath.length % 2 == 0) {
        console.warn("path untuk akses Collection data tidak boleh berhenti di Doc [Firestore.listen.collection]")
        return () => { }
      }
      //@ts-ignore
      const colRef = collection(Firestore.db(), ...fixedPath)
      let conditionsArray: any = []
      if (condition.length > 0) {
        condition.forEach((c) => {
          if (conditionIsNotValid(c)) {
            console.warn("condition tidak boleh undefined", fixedPath)
          } else {
            //@ts-ignore
            conditionsArray.push(where(...c))
          }
        })
      }
      let orderArray: any = []
      if (order_by.length > 0) {
        order_by.forEach((o) => {
          //@ts-ignore
          orderArray.push(orderBy(...o))
        })
      }
      let datas: any[] = []

      const fRef = (condition && order_by) ? query(colRef, ...conditionsArray, ...orderArray)
        : condition ? query(colRef, ...conditionsArray)
          : order_by ? query(colRef, ...orderArray) : colRef

      const unsub = onSnapshot(fRef, (snap) => {
        datas = []
        snap.docs.forEach((doc) => {
          datas.push({ data: doc.data(), id: doc.id })
        })
        cb(datas)
      }, err)
      return () => unsub()
    },
    doc(path: string[], cb: (dt: any) => void, err?: (error: any) => void): () => void {
      const fixedPath = castPathToString(path)
      if (fixedPath.length % 2 > 0) {
        console.warn("path untuk akses Doc data tidak boleh berhenti di Collection [Firestore.listen.doc]")
        return () => { }
      }
      // @ts-ignore
      const colRef = doc(Firestore.db(), ...fixedPath)
      const unsub = onSnapshot(colRef, (snap) => {
        cb(snap.data())
      }, err)
      return () => unsub()
    }
  },
  update: {
    doc(path: string[], value: updateValue[], cb: () => void, err?: (error: any) => void) {
      const fixedPath = castPathToString(path)
      if (fixedPath.length % 2 > 0) {
        console.warn("path untuk akses Doc data tidak boleh berhenti di Collection [Firestore.update.doc]")
        return
      }
      const val = value.map((x) => {
        return { [x.key]: x.value }
      })
      const objVal = Object.assign({}, ...val)
      const colRef = doc(Firestore.db(), ...fixedPath)
      updateDoc(colRef, objVal).then((e) => {
        cb()
      }).catch(err)
    },
    batchDoc(rootPath: string[], docIds: string[], values: updateValue[], callback?: (res: any) => void, error?: (error: any) => void) {
      const fixedPath = castPathToString(rootPath)
      if (fixedPath.length % 2 == 0) {
        console.warn("path untuk akses updateBatch cukup berhenti di Collection [Firestore.update.batchDoc]")
        return
      }
      const batch = writeBatch(Firestore.db());
      const value = values.map((x) => {
        return { [x.key]: x.value }
      })
      const newValue = Object.assign({}, ...value)
      docIds.forEach((id) => {
        const laRef = doc(Firestore.db(), ...fixedPath, id);
        batch.update(laRef, newValue);
      })
      batch.commit().then((result) => {
        callback && callback(result)
      }).catch((er) => {
        error && error(er)
      })
    },
  },
  paginate(isStartPage: boolean, path: string[], condition: [fieldPath?: string | FieldPath, opStr?: WhereFilterOp, value?: unknown][], order_by: [fieldPath?: string | FieldPath, directionStr?: OrderByDirection | undefined][], limitItem: number, cb: (dt: any, endReach: boolean) => void, err?: (error: any) => void): void {
    const fixedPath = castPathToString(path)
    if (fixedPath.length % 2 == 0) {
      console.warn("path untuk akses Collection data tidak boleh berhenti di Doc [Firestore.paginate]")
      return
    }
    //@ts-ignore
    const colRef = collection(Firestore.db(), ...fixedPath)

    let conditionsArray: any = []
    if (condition.length > 0) {
      condition.forEach((c) => {
        if (conditionIsNotValid(c)) {
          console.warn("condition tidak boleh undefined", fixedPath)
        } else {
          //@ts-ignore
          conditionsArray.push(where(...c))
        }
      })
    }

    let orderArray: any = []
    if (order_by.length > 0) {
      order_by.forEach((o) => {
        //@ts-ignore
        orderArray.push(orderBy(...o))
      })
    }

    const fRef = (conditionsArray.length > 0 && orderArray.length > 0) ? query(colRef, ...conditionsArray, ...orderArray, limit(limitItem))
      : conditionsArray.length > 0 ? query(colRef, ...conditionsArray, limit(limitItem))
        : orderArray.length > 0 ? query(colRef, ...orderArray, limit(limitItem)) : colRef

    const fRef1 = (conditionsArray.length > 0 && orderArray.length > 0) ? query(colRef, ...conditionsArray, ...orderArray, startAfter(lastVisible || 0), limit(limitItem))
      : conditionsArray.length > 0 ? query(colRef, ...conditionsArray, startAfter(lastVisible || 0), limit(limitItem))
        : orderArray.length > 0 ? query(colRef, ...orderArray, startAfter(lastVisible || 0), limit(limitItem)) : colRef

    let datas: any[] = []
    getDocs(isStartPage ? fRef : fRef1).then((snap) => {
      snap.docs.forEach((doc) => {
        datas.push({ data: doc.data(), id: doc.id })
      })
      lastVisible = snap.docs[snap.docs.length - 1]
      cb(datas, snap.empty)
    }).catch(err)
  },
  paginateOrderBy(isStartPage: boolean, path: string[], order_by: [fieldPath?: string | FieldPath, directionStr?: OrderByDirection | undefined][], cb: (dt: any, endReach: boolean) => void, err?: (error: any) => void) {
    Firestore.paginate(isStartPage, path, [], order_by, 20, cb, err)
  },
  paginateWhere(isStartPage: boolean, path: string[], condition: [fieldPath?: string | FieldPath, opStr?: WhereFilterOp, value?: unknown][], cb: (dt: any, endReach: boolean) => void, err?: (error: any) => void) {
    Firestore.paginate(isStartPage, path, condition, [], 20, cb, err)
  },
  paginateLimit(isStartPage: boolean, path: string[], limitItem: number, cb: (dt: any, endReach: boolean) => void, err?: (error: any) => void) {
    Firestore.paginate(isStartPage, path, [], [], limitItem, cb, err)
  },
}

export default Firestore
