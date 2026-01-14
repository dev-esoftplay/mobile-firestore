// useLibs

globalThis.RNFB_SILENCE_MODULAR_DEPRECATION_WARNINGS = true;

import { getApps, initializeApp, ReactNativeFirebase } from '@react-native-firebase/app';
import { createUserWithEmailAndPassword, FirebaseAuthTypes, getAuth, onAuthStateChanged, signInWithEmailAndPassword, signOut } from '@react-native-firebase/auth';
import { addDoc, collection, deleteDoc, doc, FirebaseFirestoreTypes, getDoc, getDocs, getFirestore, limit, onSnapshot, orderBy, query, setDoc, startAfter, updateDoc, where, writeBatch } from '@react-native-firebase/firestore';
import esp from 'esoftplay/esp';
import { MMKV } from 'react-native-mmkv';

const storage = new MMKV({ id: "firestore" })

const conditionIsNotValid = (where: any[]): boolean => {
  return where[2] == undefined || where[0] == undefined
}

const makeid = (length: number) => {
  var result = '';
  var characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  var charactersLength = characters.length;
  for (var i = 0; i < length; i++) {
    result += characters.charAt(Math.floor(Math.random() *
      charactersLength));
  }
  return result;
}

const generatePassword = (unique: string, email: string): string => {
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

let lastVisible: any = null
const APPS_KEY = 'firebase-user'

type Condition = [fieldPath?: string | number | FirebaseFirestoreTypes.FieldPath, opStr?: FirebaseFirestoreTypes.WhereFilterOp, value?: any];
type OrderBy = [fieldPath: string | number | FirebaseFirestoreTypes.FieldPath, directionStr?: "asc" | "desc"];

export default function UseFirestore() {
  const defConfig: ReactNativeFirebase.FirebaseAppOptions = {}

  const defAppName = "[DEFAULT]"

  const castPathToString = (path: any[]): string => {
    const strings = path?.map?.(x => String(x)) || []
    return strings.join("/")
  }
  function setUserData(appName: string, user: any) {
    const currentData = getAllUserData()
    currentData[appName] = user
    storage.set(APPS_KEY, JSON.stringify(currentData))
  }
  function getUserData(appName: string) {
    const currentData = getAllUserData()
    return currentData[appName] || {}
  }
  function getAllUserData() {
    const data: any = storage.getString(APPS_KEY)
    return data ? typeof data == "string" ? JSON.parse(data) : data : {}
  }
  function removeAllUserData() {
    storage.delete(APPS_KEY)
  }

  let initPromise: Promise<void> | null = null
  const init = async (
    config = defConfig,
    appName = defAppName
  ) => {
    if (initPromise) return initPromise

    initPromise = (async () => {
      const existingApp = getApps().find(app => app.name === appName)

      if (!existingApp) {
        initializeApp(config, appName)
      }
    })()

    return initPromise
  }

  const listenAuth = (appName = defAppName) => {
    const app = getApps().find(a => a.name === appName)
    if (!app) return () => { }

    const auth = getAuth(app)

    return onAuthStateChanged(auth, user => {
      if (user) {
        setUserData(appName, user)
      } else {
        removeAllUserData()
      }
    })
  }

  let ensureAuthPromise: Promise<void> | null = null
  async function ensureAuth() {
    if (ensureAuthPromise) return ensureAuthPromise

    ensureAuthPromise = (async () => {
      try {
        const firestore = esp.mod("firestore/index")?.()
        const app = firestore?.instance?.()
        if (!app) return

        const auth = getAuth(app)

        // Wait until Firebase finishes restoring auth state
        await new Promise<void>(resolve => {
          let resolved = false

          const unsub = onAuthStateChanged(auth, () => {
            if (!resolved) {
              resolved = true
              unsub()
              // small delay to allow auth stabilization
              setTimeout(resolve, 0)
            }
          })
        })

        // If Firebase already has a user, stop
        if (auth.currentUser) return

        const user = esp.mod("user/class").state().get()
        const email = user?.email
        if (!email) return

        const pass = esp.mod("lib/utils").shorten(email + user?.id)
        const password = generatePassword(pass, email)

        await register(app, email, password, credential => {
          setUserData(app.name, credential.user)
        })

      } catch (e) {
        console.warn('[ensureAuth] failed:', e)
      } finally {
        // 🔥 allow retry if needed
        ensureAuthPromise = null
      }
    })()

    return ensureAuthPromise
  }

  const instance = (appName = defAppName) => {
    const app = getApps().find(app => app.name === appName);
    return app || null;
  };

  const register = async (
    app: ReactNativeFirebase.FirebaseApp,
    email: string,
    password: string,
    callback: (credential: FirebaseAuthTypes.UserCredential) => void
  ) => {
    const authInstance = getAuth(app);
    try {
      const credential = await createUserWithEmailAndPassword(authInstance, email, password);
      callback(credential);
    } catch (error: any) {
      switch (error.code) {
        case 'auth/email-already-in-use':
          return login(app, email, password, callback);
        case 'auth/invalid-email':
          console.error('Invalid email address format.');
          break;
        case 'auth/unknown':
          console.warn('Unknown error occurred. Retrying registration.');
          return register(app, email, password, callback);
        case 'auth/configuration-not':
          console.error('Authentication is not configured for this Firebase project.');
          break;
        case 'auth/operation-not-allowed':
          console.error('Sign-in provider is not enabled. Check Firebase console.');
          break;
        default:
          console.error('Registration error:', error.message || error);
      }
    }
  }

  const login = async (
    app: ReactNativeFirebase.FirebaseApp,
    email: string,
    password: string,
    callback: (credential: FirebaseAuthTypes.UserCredential) => void,
  ) => {
    const authInstance = getAuth(app);
    try {
      const credential = await signInWithEmailAndPassword(authInstance, email, password);
      callback(credential);
    } catch (error: any) {
      switch (error.code) {
        case 'auth/user-not-found':
          console.error('No user found with this email.');
          break;
        case 'auth/wrong-password':
          console.error('Incorrect password. Please try again.');
          break;
        case 'auth/too-many-requests':
          console.warn('Too many attempts. Please try again later.');
          break;
        case 'auth/invalid-email':
          console.error('Invalid email address format.');
          break;
        case 'auth/network-request-failed':
          console.error('Network error. Please check your connection.');
          break;
        default:
          console.error('Login error:', error.message || error);
      }
    }
  }

  const logout = async (): Promise<void> => {
    try {
      removeAllUserData();
      const signOutPromises = getApps().map(async (app: any) => {
        const authInstance = getAuth(app);
        await signOut(authInstance);
      });
      await Promise.all(signOutPromises);
      // console.log('All users signed out successfully.');
    } catch (error: any) {
      switch (error.code) {
        case 'auth/no-current-user':
          console.log('No user signed in.');
          break;
        default:
          console.log('Logout error:', error.message || error);
      }
    }
  }

  const getDocument = (app: ReactNativeFirebase.FirebaseApp, path: string[], callback: (data: { id: string, data: any }) => void, error?: () => void) => {
    const fixedPath = castPathToString(path)
    if (fixedPath.split("/").length % 2 > 0) {
      console.warn("path untuk akses Doc data tidak boleh berhenti di Collection [Firestore.get.doc]")
      return
    }
    const db = getFirestore(app)
    const ref = doc(db, fixedPath)
    getDoc(ref).then((snapshot: FirebaseFirestoreTypes.DocumentSnapshot) => {
      callback({ data: snapshot.data(), id: snapshot.id })
    }).catch((error))
  }

  const addDocument = (app: ReactNativeFirebase.FirebaseApp, path: string[], value: any, callback: () => void, error?: (error: any) => void) => {
    const fixedPath = castPathToString(path)
    const db = getFirestore(app)

    if (fixedPath.split("/").length % 2 > 0) {
      const docRef = collection(db, fixedPath)
      addDoc(docRef, value)
        .then(() => {
          callback()
        }).catch(error)
    } else {
      const docRef = doc(db, fixedPath)
      setDoc(docRef, value)
        .then(() => {
          callback()
        }).catch(error)
    }
  }

  const updateDocument = (app: ReactNativeFirebase.FirebaseApp, path: string[], values: { key: string, value: string | number }[], callback: () => void, error?: (error: any) => void) => {
    const fixedPath = castPathToString(path)
    if (fixedPath.split("/").length % 2 > 0) {
      console.warn("path untuk akses Doc data tidak boleh berhenti di Collection [Firestore.update.doc]")
      return
    }
    const db = getFirestore(app)
    const val = values.map((x) => {
      return { [x.key]: x.value }
    })
    const objVal = Object.assign({}, ...val)
    const colRef = doc(db, fixedPath)
    updateDoc(colRef, objVal).then((e) => {
      callback()
    }).catch(error)
  }

  const updateBatchDocument = (app: ReactNativeFirebase.FirebaseApp, rootPath: string[], documentIds: string[], values: { key: string, value: string | number }[], callback?: (res: any) => void, error?: (error: any) => void) => {
    const fixedPath = castPathToString(rootPath)
    if (fixedPath.split("/").length % 2 == 0) {
      console.warn("path untuk akses updateBatch cukup berhenti di Collection [Firestore.update.batchDoc]")
      return
    }

    const value = values.map((x) => {
      return { [x.key]: x.value }
    })
    const newValue = Object.assign({}, ...value)

    const db = getFirestore(app)
    const batch = writeBatch(db)
    const processBatch = async () => {
      const promises = documentIds.map(async (id) => {
        const docRef = doc(db, fixedPath + "/" + id)
        batch.update(docRef, newValue)
      });
      await Promise.all(promises)
      await batch.commit()
    }

    processBatch().then((result) => {
      callback && callback(result)
    }).catch((er) => {
      error && error(er)
    })
  }

  const deleteDocument = (app: ReactNativeFirebase.FirebaseApp, path: string[], callback: () => void, error?: (error: any) => void) => {
    const fixedPath = castPathToString(path)
    if (fixedPath.split("/").length % 2 > 0) {
      console.warn("path untuk akses Doc data tidak boleh berhenti di Collection [Firestore.delete.doc]")
      return
    }
    const db = getFirestore(app)
    const ref = doc(db, fixedPath)
    deleteDoc(ref).then(() => {
      callback()
    }).catch((error))
  }

  const deleteBatchDocument = (app: ReactNativeFirebase.FirebaseApp, rootPath: string[], documentIds: string[], callback?: (res: any) => void, error?: (error: any) => void) => {
    const fixedPath = castPathToString(rootPath)
    if (fixedPath.split("/").length % 2 == 0) {
      console.warn("path untuk akses deleteBatch cukup berhenti di Collection [Firestore.delete.batchDoc]")
      return
    }
    const db = getFirestore(app)
    const batch = writeBatch(db)

    const processBatch = async () => {
      const promises = documentIds.map(async (id) => {
        const docRef = doc(db, fixedPath + "/" + id)
        batch.delete(docRef)
      });
      await Promise.all(promises)
      await batch.commit()
    }

    processBatch().then((result) => {
      callback && callback(result)
    }).catch((er) => {
      error && error(er)
    })
  }

  const addCollection = (app: ReactNativeFirebase.FirebaseApp, path: string[], value: any, callback: (data?: { id: string }) => void, error?: (error: any) => void) => {
    const fixedPath = castPathToString(path)
    if (fixedPath.split("/").length % 2 == 0) {
      console.warn("path untuk akses Collection data tidak boleh berhenti di Doc [Firestore.add.collection]")
      return
    }
    const id = (new Date().getTime() / 1000).toFixed(0) + "-" + makeid(5)
    addDocument(app, [...path, id], value, () => callback({ id }), error)
  }

  const getCollectionWhereOrderBy = (app: ReactNativeFirebase.FirebaseApp, path: string[], conditions: Condition[], orderby: OrderBy[], callback: (data: any[]) => void, error?: (error: any) => void, limitasi?: number) => {
    const fixedPath = castPathToString(path)
    if (fixedPath.split("/").length % 2 == 0) {
      console.warn("path untuk akses Collection data tidak boleh berhenti di Doc [Firestore.get.collection]")
      return
    }

    const database = getFirestore(app)
    let queryRef: FirebaseFirestoreTypes.Query = collection(database, fixedPath)

    queryRef = applyConditions(queryRef, conditions)
    queryRef = applyOrdering(queryRef, orderby)
    if (limitasi) {
      queryRef = applyLimiting(queryRef, limitasi)
    }

    let datas: any[] = []
    getDocs(queryRef).then((snap) => {
      if (snap?.docs?.length > 0)
        snap?.docs?.forEach?.((doc) => {
          datas.push({ data: doc.data(), id: doc.id })
        })
      callback(datas)
    }).catch(error)
  }

  const getCollectionLimit = (app: ReactNativeFirebase.FirebaseApp, path: string[], conditions: Condition[], orderby: OrderBy[], limitasi: number = 1, callback: (data: any[]) => void, error?: (error: any) => void) => {
    getCollectionWhereOrderBy(app, path, conditions, orderby, callback, error, limitasi)
  }
  const getCollection = (app: ReactNativeFirebase.FirebaseApp, path: string[], callback: (data: any[]) => void, error?: (error: any) => void) => {
    getCollectionWhereOrderBy(app, path, [], [], callback, error)
  }

  const getCollectionIds = (app: ReactNativeFirebase.FirebaseApp, path: string[], conditions: Condition[], orderby: OrderBy[], callback: (ids: string[]) => void, error?: (error: any) => void) => {
    getCollectionWhereOrderBy(app, path, conditions, orderby, (data) => {
      let ids: string[] = []
      data.forEach(doc => {
        ids.push(doc.id)
      })
      callback(ids)
    }, error)
  }

  const getCollectionWhere = (app: ReactNativeFirebase.FirebaseApp, path: string[], conditions: Condition[], callback: (data: any[]) => void, error?: (error: any) => void) => {
    getCollectionWhereOrderBy(app, path, conditions, [], callback, error)
  }

  const getCollectionOrderBy = (app: ReactNativeFirebase.FirebaseApp, path: string[], orderby: OrderBy[], callback: (data: any[]) => void, error?: (error: any) => void) => {
    getCollectionWhereOrderBy(app, path, [], orderby, callback, error)
  }

  const listenDocument = (app: ReactNativeFirebase.FirebaseApp, path: string[], callback: (data: any | null) => void, error?: (error: any) => void): (() => void) => {
    const fixedPath = castPathToString(path);
    if (fixedPath.split("/").length % 2 !== 0) {
      console.warn("Path untuk akses Doc data tidak boleh berhenti di Collection [Firestore.listen.doc]");
      return () => { };
    }

    const db = getFirestore(app);
    const docRef = doc(db, fixedPath);

    const unsubscribe = onSnapshot(docRef, (docs) => {
      if (docs?.exists?.()) {
        callback({ data: docs?.data(), id: docs?.id });
      } else {
        callback(null);
      }
    }, error);

    return unsubscribe;
  }

  const listenCollection = (app: ReactNativeFirebase.FirebaseApp, path: string[], conditions: Condition[], orderby: OrderBy[], callback: (data: any) => void, error?: (error: any) => void): (() => void) => {
    const fixedPath = castPathToString(path);
    if (fixedPath.split("/").length % 2 === 0) {
      console.warn("Path untuk akses Collection data tidak boleh berhenti di Doc [Firestore.listen.collection]");
      return () => { };
    }

    const database = getFirestore(app);
    let queryRef: FirebaseFirestoreTypes.Query = collection(database, fixedPath);

    queryRef = applyConditions(queryRef, conditions);
    queryRef = applyOrdering(queryRef, orderby);

    const unsubscribe = onSnapshot(queryRef, (snaps) => {
      const datas: any[] = [];
      if (!snaps?.empty && snaps?.docs?.length > 0) {
        snaps?.docs?.forEach?.((doc) => {
          datas.push({ data: doc?.data(), id: doc?.id });
        });
      }
      callback(datas);
    }, error);

    return unsubscribe;
  }

  const paginate = (
    app: ReactNativeFirebase.FirebaseApp,
    isStartPage: boolean,
    path: string[],
    conditions: Condition[],
    orderby: OrderBy[],
    limitPerPage: number,
    callback: (data: any[], endReach: boolean) => void,
    error?: (error: any) => void
  ) => {
    const fixedPath = castPathToString(path)
    if (fixedPath.split("/").length % 2 == 0) {
      console.warn("path untuk akses Collection data tidak boleh berhenti di Doc [Firestore.paginate]")
      return
    }

    const db = getFirestore(app)
    let queryRef: FirebaseFirestoreTypes.Query = collection(db, fixedPath);

    queryRef = applyConditions(queryRef, conditions);
    queryRef = applyOrdering(queryRef, orderby);
    queryRef = applyPagination(queryRef, isStartPage, limitPerPage);

    let allData: any[] = []
    getDocs(queryRef).then((snap) => {
      snap?.docs?.forEach?.((r) => {
        allData.push(r.id)
      })
      if (snap?.docs?.length > 0) {
        lastVisible = snap?.docs?.[snap?.docs?.length - 1];
      }
      callback(allData, snap?.empty)
    }).catch(error)
  }

  const applyConditions = (queryRef: FirebaseFirestoreTypes.Query, conditions: Condition[]): FirebaseFirestoreTypes.Query => {
    if (conditions && conditions.length > 0) {
      conditions.forEach((c) => {
        if (!conditionIsNotValid(c)) {
          queryRef = query(queryRef, where(c[0] as string, c[1] as FirebaseFirestoreTypes.WhereFilterOp, c[2]));
        }
      });
    }
    return queryRef;
  };

  const applyOrdering = (queryRef: FirebaseFirestoreTypes.Query, orderby: OrderBy[]): FirebaseFirestoreTypes.Query => {
    if (orderby && orderby.length > 0) {
      orderby.forEach((o) => {
        queryRef = query(queryRef, orderBy(o[0] as string, o[1]));
      });
    }
    return queryRef;
  };

  const applyLimiting = (queryRef: FirebaseFirestoreTypes.Query, limitasi: number): FirebaseFirestoreTypes.Query => {
    if (!!limitasi) {
      queryRef = query(queryRef, limit(limitasi));
    }
    return queryRef;
  };

  const applyPagination = (queryRef: FirebaseFirestoreTypes.Query, isStartPage: boolean, limitPerPage: number): FirebaseFirestoreTypes.Query => {
    if (!isStartPage && lastVisible) {
      queryRef = query(queryRef, startAfter(lastVisible));
    }
    return query(queryRef, limit(limitPerPage));
  };

  return {
    init,
    listenAuth,
    ensureAuth,
    getUserData,
    logout,
    instance,
    addDocument,
    getDocument,
    updateDocument,
    updateBatchDocument,
    deleteDocument,
    deleteBatchDocument,
    addCollection,
    getCollectionLimit,
    getCollectionWhereOrderBy,
    getCollection,
    getCollectionIds,
    getCollectionWhere,
    getCollectionOrderBy,
    listenDocument,
    listenCollection,
    paginate,
    castPathToString,
    generatePassword
  }
}