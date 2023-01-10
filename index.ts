// useLibs
// noPage

import AsyncStorage from '@react-native-async-storage/async-storage';
import esp from 'esoftplay/esp';
import _global from 'esoftplay/_global';
import { initializeApp } from 'firebase/app';
import { initializeAuth, signInAnonymously } from 'firebase/auth';
import { getReactNativePersistence } from 'firebase/auth/react-native';
import { addDoc, collection, deleteDoc, doc, FieldPath, getDoc, getDocs, initializeFirestore, limit, onSnapshot, orderBy, OrderByDirection, query, setDoc, startAfter, updateDoc, where, WhereFilterOp, writeBatch } from 'firebase/firestore';

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
        experimentalForceLongPolling: true
      })
    return _global.firebaseFirestore
  },
  add: {
    doc(path: string[], value: any, cb: () => void, err?: (error: any) => void) {
      if (path.length % 2 > 0) {
        console.warn("path untuk akses Doc data tidak boleh berhenti di Collection [Firestore.add.doc]")
        return
      }
      const colRef = doc(Firestore.db(), ...path)
      setDoc(colRef, value).then((snap) => {
        cb()
      }).catch(err)
    },
    collection(path: string[], value: any, cb: (dt: any) => void, err?: (error: any) => void) {
      if (path.length % 2 == 0) {
        console.warn("path untuk akses Collection data tidak boleh berhenti di Doc [Firestore.add.collection]")
        return
      }
      //@ts-ignore
      const colRef = collection(Firestore.db(), ...path)
      addDoc(colRef, value).then((snap) => {
        cb({ id: snap?.id })
      }).catch(err)
    }
  },
  delete: {
    doc(path: string[], cb: () => void, err?: (error: any) => void) {
      if (path.length % 2 > 0) {
        console.warn("path untuk akses Doc data tidak boleh berhenti di Collection [Firestore.delete.doc]")
        return
      }
      const colRef = doc(Firestore.db(), ...path)
      deleteDoc(colRef).then((snap) => {
        cb()
      }).catch(err)
    }
  },
  get: {
    doc(path: string[], condition: [fieldPath?: string | FieldPath, opStr?: WhereFilterOp, value?: unknown], cb: (arr: DataId) => void, err?: (error: any) => void) {
      if (path.length % 2 > 0) {
        console.warn("path untuk akses Doc data tidak boleh berhenti di Collection [Firestore.get.doc]")
        return
      }
      //@ts-ignore
      const colRef = doc(Firestore.db(), ...path)
      //@ts-ignore
      const fRef = (!condition || condition.length < 3) ? colRef : query(colRef, where(...condition))
      //@ts-ignore
      getDoc(fRef).then((snap) => {
        cb({ data: snap.data(), id: snap.id })
      }).catch(err)
    },
    collectionWhereOrderBy(path: string[], condition: [fieldPath?: string | FieldPath, opStr?: WhereFilterOp, value?: unknown][], order_by: [fieldPath?: string | FieldPath, directionStr?: OrderByDirection | undefined][], cb: (arr: DataId[]) => void, err?: (error: any) => void) {
      if (path.length % 2 == 0) {
        console.warn("path untuk akses Collection data tidak boleh berhenti di Doc [Firestore.get.collection]")
        return
      }
      //@ts-ignore
      const colRef = collection(Firestore.db(), ...path)
      let conditionsArray: any = []
      if (condition.length > 0) {
        condition.forEach((c) => {
          //@ts-ignore
          conditionsArray.push(where(...c))
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
      if (path.length % 2 == 0) {
        console.warn("path untuk akses Collection data tidak boleh berhenti di Doc [Firestore.get.collectionIds]")
        return
      }
      //@ts-ignore
      const colRef = collection(Firestore.db(), ...path)
      let conditionsArray: any = []
      if (condition.length > 0) {
        condition.forEach((c) => {
          //@ts-ignore
          conditionsArray.push(where(...c))
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
      if (path.length % 2 == 0) {
        console.warn("path untuk akses Collection data tidak boleh berhenti di Doc [Firestore.listen.collection]")
        return () => { }
      }
      //@ts-ignore
      const colRef = collection(Firestore.db(), ...path)
      let conditionsArray: any = []
      if (condition.length > 0) {
        condition.forEach((c) => {
          //@ts-ignore
          conditionsArray.push(where(...c))
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
      if (path.length % 2 > 0) {
        console.warn("path untuk akses Doc data tidak boleh berhenti di Collection [Firestore.listen.doc]")
        return () => { }
      }
      // @ts-ignore
      const colRef = doc(Firestore.db(), ...path)
      const unsub = onSnapshot(colRef, (snap) => {
        cb(snap.data())
      }, err)
      return () => unsub()
    }
  },
  update: {
    doc(path: string[], value: updateValue[], cb: () => void, err?: (error: any) => void) {
      if (path.length % 2 > 0) {
        console.warn("path untuk akses Doc data tidak boleh berhenti di Collection [Firestore.update.doc]")
        return
      }
      const val = value.map((x) => {
        return { [x.key]: x.value }
      })
      const objVal = Object.assign({}, ...val)
      const colRef = doc(Firestore.db(), ...path)
      updateDoc(colRef, objVal).then((e) => {
        cb()
      }).catch(err)
    },
    batchDoc(path: string[], valueToUpdate: any[], cb: () => void, err?: (error: any) => void) {
      if (path.length % 2 > 0) {
        console.warn("path untuk akses Doc data tidak boleh berhenti di Collection [Firestore.update.doc]")
        return
      }
      const batch = writeBatch(Firestore?.db());
      const sfRef = doc(Firestore?.db(), ...path);

      valueToUpdate.forEach((e) => {
        batch.update(sfRef, e);
      })

      batch.commit().then((res) => {
        cb()
      }).catch(err)
    }
  },
  paginate(isStartPage: boolean, path: string[], condition: [fieldPath?: string | FieldPath, opStr?: WhereFilterOp, value?: unknown][], order_by: [fieldPath?: string | FieldPath, directionStr?: OrderByDirection | undefined][], limitItem: number, cb: (dt: any, endReach: boolean) => void, err?: (error: any) => void): void {
    if (path.length % 2 == 0) {
      console.warn("path untuk akses Collection data tidak boleh berhenti di Doc [Firestore.paginate]")
      return
    }
    //@ts-ignore
    const colRef = collection(Firestore.db(), ...path)

    let conditionsArray: any = []
    if (condition.length > 0) {
      condition.forEach((c) => {
        //@ts-ignore
        conditionsArray.push(where(...c))
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