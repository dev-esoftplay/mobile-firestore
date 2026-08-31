// useLibs
// noPage

import { sendTm } from "esoftplay/error";
import esp from "esoftplay/esp";
import useGlobalState from "esoftplay/global";
import Constants from 'expo-constants';
import { Platform } from "react-native";
const { expoConfig } = Constants;

const state = useGlobalState<any>({})

function shouldSendTelegram(email: string, message: string) {
  const now = Date.now()
  const DELAY = 30 * 60 * 1000
  const lastSent = state.get?.()?.[email]?.[message]
  if (lastSent && now - lastSent <= DELAY) {
    return false
  }
  state.set(esp.mod("lib/object").set(state.get(), { [email]: { [message]: now } })())
  return true
}

const FirestoreError = {
  send: (message: string) => {
    const user = esp.mod("user/class").state().get()
    const email = user?.email

    if (!message) return
    if (!email) return

    const appVersion = Platform.OS === 'android'
      ? expoConfig?.android?.versionCode
      : expoConfig?.ios?.buildNumber;

    const project_id = esp.assets("google-services.json")?.project_info?.project_id

    let notes = [
      `#firestore_error ${message}`,
      `\nemail : ${email}`,
      `slug : #${expoConfig?.slug}`,
      `device : ${Constants?.deviceName}`,
      `platform - version : ${Platform.OS} - ${Constants.systemVersion}`,
      `app-sdk: ${appVersion} - ${Constants.expoConfig?.sdkVersion}`
    ]

    if (message == "auth/wrong-password") {
      notes.push(
        `\nhttps://console.firebase.google.com/u/0/project/${project_id}/authentication/users`,
        `open link and search email : ${email} -> check last sign in -> if older than current time -> show options -> delete account.`
      )
    }

    if (shouldSendTelegram(email, message)) {
      sendTm(notes.join('\n'), '355199743', "964126173:AAEk8HoVJw_d-7dH3rhoLzJ88oVIDkI6IxI")
    }

  }
}

export default FirestoreError