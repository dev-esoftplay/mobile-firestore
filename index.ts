// useLibs

import AsyncStorage from "@react-native-async-storage/async-storage";
import { LibUtils } from "esoftplay/cache/lib/utils/import";
import { UserClass } from "esoftplay/cache/user/class/import";
import esp from "esoftplay/esp";
import { FirebaseApp, initializeApp } from "firebase/app";
import { Auth, createUserWithEmailAndPassword, initializeAuth, signInAnonymously, signInWithEmailAndPassword, signOut } from "firebase/auth";
import { getReactNativePersistence } from "firebase/auth/react-native";
import { FieldPath, Firestore, OrderByDirection, WhereFilterOp, addDoc, collection, deleteDoc, doc, getDoc, getDocs, initializeFirestore, limit, onSnapshot, orderBy, query, setDoc, startAfter, updateDoc, where, writeBatch } from "firebase/firestore";


export interface FirestoreInstance {
  app: FirebaseApp;
  auth: Auth;
  db: Firestore;
}

export interface useFirestoreReturn {
  init: (appName?: string, config?: any) => FirestoreInstance,
  initAnonymously: (appName?: string, config?: any) => FirestoreInstance,
  getDocument: (database: any, path: string[], condition: [fieldPath?: string | FieldPath, opStr?: WhereFilterOp, value?: unknown], cb: (arr: DataId) => void, err?: (error: any) => void) => void,
  getCollection: (database: any, path: string[], cb: (arr: DataId[]) => void, err?: (error: any) => void) => void,
  getCollectionIds: (database: any, path: string[], condition: [fieldPath?: string | FieldPath, opStr?: WhereFilterOp, value?: unknown][], cb: (arr: id[]) => void, err?: (error: any) => void) => void
  getCollectionWhere: (database: any, path: string[], condition: [fieldPath?: string | FieldPath, opStr?: WhereFilterOp, value?: unknown][], cb: (arr: DataId[]) => void, err?: (error: any) => void) => void
  getCollectionOrderBy: (database: any, path: string[], order_by: [fieldPath?: string | FieldPath, directionStr?: OrderByDirection | undefined][], cb: (arr: DataId[]) => void, err?: (error: any) => void) => void
  getCollectionWhereOrderBy: (database: any, path: string[], condition: [fieldPath?: string | FieldPath, opStr?: WhereFilterOp, value?: unknown][], order_by: [fieldPath?: string | FieldPath, directionStr?: OrderByDirection | undefined][], cb: (arr: DataId[]) => void, err?: (error: any) => void) => void
  addDocument: (database: any, path: string[], value: any, cb: () => void, err?: (error: any) => void) => void
  addCollection: (database: any, path: string[], value: any, cb: (dt: any) => void, err?: (error: any) => void) => void
  deleteDocument: (database: any, path: string[], cb: () => void, err?: (error: any) => void) => void
  deleteBatchDocument: (database: any, rootPath: string[], docIds: string[], callback?: (res: any) => void, error?: (error: any) => void) => void
  listenCollection: (database: any, path: string[], condition: [fieldPath?: string | FieldPath, opStr?: WhereFilterOp, value?: unknown][], order_by: [fieldPath?: string | FieldPath, directionStr?: OrderByDirection | undefined][], cb: (dt: any) => void, err?: (error: any) => void) => () => void
  listenDocument: (database: any, path: string[], cb: (dt: any) => void, err?: (error: any) => void) => () => void
  updateDocument: (database: any, path: string[], value: updateValue[], cb: () => void, err?: (error: any) => void) => void
  updateBatchDocument: (database: any, rootPath: string[], docIds: string[], values: updateValue[], callback?: (res: any) => void, error?: (error: any) => void) => void
  paginate: (database: any, isStartPage: boolean, path: string[], condition: [fieldPath?: string | FieldPath, opStr?: WhereFilterOp, value?: unknown][], order_by: [fieldPath?: string | FieldPath, directionStr?: OrderByDirection | undefined][], limitItem: number, cb: (dt: any, endReach: boolean) => void, err?: (error: any) => void) => void
  paginateOrderBy: (database: any, isStartPage: boolean, path: string[], order_by: [fieldPath?: string | FieldPath, directionStr?: OrderByDirection | undefined][], cb: (dt: any, endReach: boolean) => void, err?: (error: any) => void) => void
  paginateWhere: (database: any, isStartPage: boolean, path: string[], condition: [fieldPath?: string | FieldPath, opStr?: WhereFilterOp, value?: unknown][], cb: (dt: any, endReach: boolean) => void, err?: (error: any) => void) => void
  paginateLimit: (database: any, isStartPage: boolean, path: string[], limitItem: number, cb: (dt: any, endReach: boolean) => void, err?: (error: any) => void) => void,
  generatePassword: (uniquePassword: string, email: string) => string,
  logout: (auth: any) => void
}

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

const initializedInstances: { [appName: string]: FirestoreInstance } = {};

const firestoreSettings = {
  useFetchStreams: false
}

export default function useFirestore(): useFirestoreReturn {

  function init(appName?: string, config?: any): FirestoreInstance {
    const defAppName = appName || "firestore-test";
    const defConfig = config || esp.config("firebase");
    const user = UserClass.state().get()

    const email = user?.email
    const pass = LibUtils.shorten(user?.email + "" + user?.id)
    const password = generatePassword(pass, email)

    if (esp.config().hasOwnProperty('firebase')) {
      if (defConfig.hasOwnProperty('projectId') && defConfig.hasOwnProperty('apiKey')) {
        if (user) {
          if (initializedInstances[defAppName]) {
            return initializedInstances[defAppName];
          }

          const firebaseApp = initializeApp(defConfig, defAppName);
          const firebaseAppAuth = initializeAuth(firebaseApp, { persistence: getReactNativePersistence(AsyncStorage) });

          function doRegister(email: string, password: string) {
            createUserWithEmailAndPassword(firebaseAppAuth, email, password)
              .then((userCredential) => { })
              .catch((error) => {
                if (error.code == "auth/email-already-in-use") {
                  doLogin(email, password)
                } else {
                  throw "ERROR : " + error.code
                }
              });
          }
          function doLogin(email: string, password: string) {
            signOut(firebaseAppAuth).then(() => {
              signInWithEmailAndPassword(firebaseAppAuth, email, password)
                .then((userCredential) => { })
                .catch((error) => {
                  if (error.code == "auth/user-not-found") {
                    doRegister(email, password)
                  } else {
                    throw "ERROR : " + error.code
                  }
                });
            }).catch((error) => {
              console.log("ERROR", error);
            });
          }

          doLogin(email, password)

          const firestoreDB = initializeFirestore(firebaseApp, {
            ...firestoreSettings,
            experimentalForceLongPolling: true,
          });

          const firestoreInstance: FirestoreInstance = {
            app: firebaseApp,
            auth: firebaseAppAuth,
            db: firestoreDB,
          };
          initializedInstances[defAppName] = firestoreInstance;

          return firestoreInstance;
        } else {
          return {
            app: {},
            auth: {},
            db: {},
          }
        }
      } else {
        throw "ERROR : firebase projectId or apiKey not found in config.json"
      }
    } else {
      throw "ERROR : firebase not found in config.json"
    }

  }

  function initAnonymously(appName?: string, config?: any): FirestoreInstance {
    const defAppName = appName || "firestore-test";
    const defConfig = config || esp.config("firebase");

    if (esp.config().hasOwnProperty('firebase')) {
      if (defConfig.hasOwnProperty('projectId') && defConfig.hasOwnProperty('apiKey')) {
        if (initializedInstances[defAppName]) {
          return initializedInstances[defAppName];
        }

        const firebaseApp = initializeApp(defConfig, defAppName);
        const firebaseAppAuth = initializeAuth(firebaseApp, { persistence: getReactNativePersistence(AsyncStorage) });

        signInAnonymously(firebaseAppAuth)

        const firestoreDB = initializeFirestore(firebaseApp, {
          ...firestoreSettings,
          experimentalForceLongPolling: true,
        });

        const firestoreInstance: FirestoreInstance = {
          app: firebaseApp,
          auth: firebaseAppAuth,
          db: firestoreDB,
        };
        initializedInstances[defAppName] = firestoreInstance;

        return firestoreInstance;
      } else {
        throw "ERROR : firebase projectId or apiKey not found in config.json"
      }
    } else {
      throw "ERROR : firebase not found in config.json"
    }
  }

  function logout(firebaseAppAuth: any) {
    signOut(firebaseAppAuth).then(() => {
    }).catch((error) => {
      console.log("ERROR", error);
    });
  }

  function generatePassword(unique: string, email: string): string {
    let updatedEmail = '';
    const atIndex = email?.indexOf?.('@');
    const first = email?.substring?.(0, atIndex);
    const last = email?.substring?.(atIndex + 1);
    const minLength = Math.min(unique?.length || 0, first?.length || 0);

    for (let i = 0; i < minLength; i++) {
      updatedEmail += unique[i] + first[i];
    }

    if (unique.length > minLength) {
      updatedEmail += unique.slice(minLength);
    } else if (first.length > minLength) {
      updatedEmail += first.slice(minLength);
    }

    return updatedEmail + "@" + last;
  }

  function getDocument(database: any, path: string[], condition: [fieldPath?: string | FieldPath, opStr?: WhereFilterOp, value?: unknown], cb: (arr: DataId) => void, err?: (error: any) => void) {
    const fixedPath = castPathToString(path)
    if (fixedPath.length % 2 > 0) {
      console.warn("path untuk akses Doc data tidak boleh berhenti di Collection [Firestore.get.doc]")
      return
    }
    const colRef = doc(database, ...fixedPath)
    //@ts-ignore
    const fRef = (!condition || condition.length < 3) ? colRef : query(colRef, where(...condition))
    //@ts-ignore
    getDoc(fRef).then((snap) => {
      cb({ data: snap.data(), id: snap.id })
    }).catch(err)
  }
  function getCollection(database: any, path: string[], cb: (arr: DataId[]) => void, err?: (error: any) => void) {
    getCollectionWhereOrderBy(database, path, [], [], cb, err)
  }
  function getCollectionIds(database: any, path: string[], condition: [fieldPath?: string | FieldPath, opStr?: WhereFilterOp, value?: unknown][], cb: (arr: id[]) => void, err?: (error: any) => void) {
    const fixedPath = castPathToString(path)
    if (fixedPath.length % 2 == 0) {
      console.warn("path untuk akses Collection data tidak boleh berhenti di Doc [Firestore.get.collectionIds]")
      return
    }
    //@ts-ignore
    const colRef = collection(database, ...fixedPath)
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
    //@ts-ignore
    getDocs(fRef).then((snap) => {
      snap.docs.forEach((doc) => {
        datas.push(doc.id)
      })
      cb(datas)
    }).catch(err)
  }
  function getCollectionWhere(database: any, path: string[], condition: [fieldPath?: string | FieldPath, opStr?: WhereFilterOp, value?: unknown][], cb: (arr: DataId[]) => void, err?: (error: any) => void) {
    getCollectionWhereOrderBy(database, path, condition, [], cb, err)
  }
  function getCollectionOrderBy(database: any, path: string[], order_by: [fieldPath?: string | FieldPath, directionStr?: OrderByDirection | undefined][], cb: (arr: DataId[]) => void, err?: (error: any) => void) {
    getCollectionWhereOrderBy(database, path, [], order_by, cb, err)
  }
  function getCollectionWhereOrderBy(database: any, path: string[], condition: [fieldPath?: string | FieldPath, opStr?: WhereFilterOp, value?: unknown][], order_by: [fieldPath?: string | FieldPath, directionStr?: OrderByDirection | undefined][], cb: (arr: DataId[]) => void, err?: (error: any) => void) {
    const fixedPath = castPathToString(path)
    if (fixedPath.length % 2 == 0) {
      console.warn("path untuk akses Collection data tidak boleh berhenti di Doc [Firestore.get.collection]")
      return
    }
    //@ts-ignore
    const colRef = collection(database, ...fixedPath)
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
    const fRef = (condition && order_by) ? query(colRef, ...conditionsArray, ...orderArray) : condition ? query(colRef, ...conditionsArray) : order_by ? query(colRef, ...orderArray) : colRef

    let datas: any[] = []
    // @ts-ignore
    getDocs(fRef).then((snap) => {
      snap.docs.forEach((doc) => {
        datas.push({ data: doc.data(), id: doc.id })
      })
      cb(datas)
    }).catch(err)
  }

  function addDocument(database: any, path: string[], value: any, cb: () => void, err?: (error: any) => void) {
    const fixedPath = castPathToString(path)
    if (fixedPath.length % 2 > 0) {
      console.warn("path untuk akses Doc data tidak boleh berhenti di Collection [Firestore.add.doc]")
      return
    }
    const colRef = doc(database, ...fixedPath)
    setDoc(colRef, value).then((snap) => {
      cb()
    }).catch(err)
  }
  function addCollection(database: any, path: string[], value: any, cb: (dt: any) => void, err?: (error: any) => void) {
    const fixedPath = castPathToString(path)

    if (fixedPath.length % 2 == 0) {
      console.warn("path untuk akses Collection data tidak boleh berhenti di Doc [Firestore.add.collection]")
      return
    }
    //@ts-ignore
    const colRef = collection(database, ...fixedPath)
    addDoc(colRef, value).then((snap) => {
      cb({ id: snap?.id })
    }).catch(err)
  }

  function deleteDocument(database: any, path: string[], cb: () => void, err?: (error: any) => void) {
    const fixedPath = castPathToString(path)
    if (fixedPath.length % 2 > 0) {
      console.warn("path untuk akses Doc data tidak boleh berhenti di Collection [Firestore.delete.doc]")
      return
    }
    const colRef = doc(database, ...fixedPath)
    deleteDoc(colRef).then((snap) => {
      cb()
    }).catch(err)
  }
  function deleteBatchDocument(database: any, rootPath: string[], docIds: string[], callback?: (res: any) => void, error?: (error: any) => void) {
    const fixedPath = castPathToString(rootPath)
    if (fixedPath.length % 2 == 0) {
      console.warn("path untuk akses deleteBatch cukup berhenti di Collection [Firestore.delete.batchDoc]")
      return
    }
    const batch = writeBatch(database);
    docIds.forEach((id) => {
      const laRef = doc(database, ...fixedPath, id);
      batch.delete(laRef);
    })
    batch.commit().then((result) => {
      callback && callback(result)
    }).catch((er) => {
      error && error(er)
    })
  }

  function listenCollection(database: any, path: string[], condition: [fieldPath?: string | FieldPath, opStr?: WhereFilterOp, value?: unknown][], order_by: [fieldPath?: string | FieldPath, directionStr?: OrderByDirection | undefined][], cb: (dt: any) => void, err?: (error: any) => void): () => void {
    const fixedPath = castPathToString(path)
    if (fixedPath.length % 2 == 0) {
      console.warn("path untuk akses Collection data tidak boleh berhenti di Doc [Firestore.listen.collection]")
      return () => { }
    }
    //@ts-ignore
    const colRef = collection(database, ...fixedPath)
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
  }
  function listenDocument(database: any, path: string[], cb: (dt: any) => void, err?: (error: any) => void): () => void {
    const fixedPath = castPathToString(path)
    if (fixedPath.length % 2 > 0) {
      console.warn("path untuk akses Doc data tidak boleh berhenti di Collection [Firestore.listen.doc]")
      return () => { }
    }
    // @ts-ignore
    const colRef = doc(database, ...fixedPath)
    const unsub = onSnapshot(colRef, (snap) => {
      cb(snap.data())
    }, err)
    return () => unsub()
  }

  function updateDocument(database: any, path: string[], value: updateValue[], cb: () => void, err?: (error: any) => void) {
    const fixedPath = castPathToString(path)
    if (fixedPath.length % 2 > 0) {
      console.warn("path untuk akses Doc data tidak boleh berhenti di Collection [Firestore.update.doc]")
      return
    }
    const val = value.map((x) => {
      return { [x.key]: x.value }
    })
    const objVal = Object.assign({}, ...val)
    const colRef = doc(database, ...fixedPath)
    updateDoc(colRef, objVal).then((e) => {
      cb()
    }).catch(err)
  }
  function updateBatchDocument(database: any, rootPath: string[], docIds: string[], values: updateValue[], callback?: (res: any) => void, error?: (error: any) => void) {
    const fixedPath = castPathToString(rootPath)
    if (fixedPath.length % 2 == 0) {
      console.warn("path untuk akses updateBatch cukup berhenti di Collection [Firestore.update.batchDoc]")
      return
    }
    const batch = writeBatch(database);
    const value = values.map((x) => {
      return { [x.key]: x.value }
    })
    const newValue = Object.assign({}, ...value)
    docIds.forEach((id) => {
      const laRef = doc(database, ...fixedPath, id);
      batch.update(laRef, newValue);
    })
    batch.commit().then((result) => {
      callback && callback(result)
    }).catch((er) => {
      error && error(er)
    })
  }

  function paginate(database: any, isStartPage: boolean, path: string[], condition: [fieldPath?: string | FieldPath, opStr?: WhereFilterOp, value?: unknown][], order_by: [fieldPath?: string | FieldPath, directionStr?: OrderByDirection | undefined][], limitItem: number, cb: (dt: any, endReach: boolean) => void, err?: (error: any) => void): void {
    const fixedPath = castPathToString(path)
    if (fixedPath.length % 2 == 0) {
      console.warn("path untuk akses Collection data tidak boleh berhenti di Doc [Firestore.paginate]")
      return
    }
    //@ts-ignore
    const colRef = collection(database, ...fixedPath)

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
  }
  function paginateOrderBy(database: any, isStartPage: boolean, path: string[], order_by: [fieldPath?: string | FieldPath, directionStr?: OrderByDirection | undefined][], cb: (dt: any, endReach: boolean) => void, err?: (error: any) => void) {
    paginate(database, isStartPage, path, [], order_by, 20, cb, err)
  }
  function paginateWhere(database: any, isStartPage: boolean, path: string[], condition: [fieldPath?: string | FieldPath, opStr?: WhereFilterOp, value?: unknown][], cb: (dt: any, endReach: boolean) => void, err?: (error: any) => void) {
    paginate(database, isStartPage, path, condition, [], 20, cb, err)
  }
  function paginateLimit(database: any, isStartPage: boolean, path: string[], limitItem: number, cb: (dt: any, endReach: boolean) => void, err?: (error: any) => void) {
    paginate(database, isStartPage, path, [], [], limitItem, cb, err)
  }

  return {
    init,
    initAnonymously,
    getDocument,
    getCollection,
    getCollectionIds,
    getCollectionWhere,
    getCollectionOrderBy,
    getCollectionWhereOrderBy,
    addDocument,
    addCollection,
    deleteDocument,
    deleteBatchDocument,
    listenCollection,
    listenDocument,
    updateDocument,
    updateBatchDocument,
    paginate,
    paginateOrderBy,
    paginateWhere,
    paginateLimit,
    generatePassword,
    logout
  }
}
