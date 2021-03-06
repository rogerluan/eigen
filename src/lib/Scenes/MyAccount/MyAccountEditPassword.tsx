import { Input } from "lib/Components/Input/Input"
import React, { useState } from "react"

import { Join, Separator, Spacer } from "@artsy/palette"

import { gravityURL } from "lib/relay/config"
import { Alert, NativeModules } from "react-native"
import { MyAccountFieldEditScreen } from "./Components/MyAccountFieldEditScreen"

const { Emission } = NativeModules

const OldAlert = Alert.alert
// iOS: UI will be blocked when show Alert while closing Modal
// https://github.com/facebook/react-native/issues/10471
Alert.alert = (...args) => {
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      OldAlert(...args)
    })
  })
}

export const MyAccountEditPassword: React.FC<{}> = ({}) => {
  const [currentPassword, setCurrentPassword] = useState<string>("")
  const [newPassword, setNewPassword] = useState<string>("")
  const [passwordConfirmation, setPasswordConfirmation] = useState<string>("")

  const onSave = async () => {
    if (newPassword !== passwordConfirmation) {
      return Alert.alert("Password confirmation does not match")
    }
    try {
      const res = await fetch(gravityURL + "/api/v1/me/password", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "X-ACCESS-TOKEN": Emission.authenticationToken,
          "User-Agent": Emission.userAgent,
        },
        body: JSON.stringify({
          current_password: currentPassword,
          new_password: newPassword,
        }),
      })
      const response = await res.json()
      // The user successfully updated his password
      if (!response.error) {
        Alert.alert(
          "Password Changed",
          "Your Password has been changed successfully. Use your new password to log in",
          [
            {
              text: "OK",
              onPress: () => NativeModules.ARNotificationsManager.postNotificationName("ARUserRequestedLogout", {}),
            },
          ],
          { cancelable: false }
        )
      }

      Alert.alert(response.error)
    } catch (error) {
      console.log(error)
    }
  }

  return (
    // @ts-ignore
    // tslint:disable-next-line:no-empty
    <MyAccountFieldEditScreen
      title={"Full Name"}
      canSave={Boolean(currentPassword && newPassword && passwordConfirmation)}
      onSave={onSave}
    >
      <Join separator={<Separator my={2} />}>
        <Input
          autoCompleteType="password"
          autoFocus
          onChangeText={setCurrentPassword}
          placeholder="Current password"
          secureTextEntry
          showClearButton
          title="Current password"
          value={currentPassword}
        />
        <>
          <Input
            description="Must include at least one uppercase letter, one lowercase letter, and one number."
            onChangeText={setNewPassword}
            placeholder="New password"
            secureTextEntry
            showClearButton
            title="New password"
            value={newPassword}
          />
          <Spacer mb="3" />
          <Input
            onChangeText={setPasswordConfirmation}
            placeholder="Confirm new password"
            secureTextEntry
            showClearButton
            title="Confirm new password"
            value={passwordConfirmation}
          />
        </>
      </Join>
    </MyAccountFieldEditScreen>
  )
}
