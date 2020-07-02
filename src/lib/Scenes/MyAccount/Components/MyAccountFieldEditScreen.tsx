import { Sans } from "@artsy/palette"
import LoadingModal from "lib/Components/Modals/LoadingModal"
import { PageWithSimpleHeader } from "lib/Components/PageWithSimpleHeader"
import SwitchBoard from "lib/NativeModules/SwitchBoard"
import React, { useImperativeHandle, useRef, useState } from "react"
import { KeyboardAvoidingView, ScrollView, TouchableOpacity, ViewStyle } from "react-native"

export interface MyAccountFieldEditScreen {
  scrollToEnd(): void
  save(): Promise<void>
}
export const MyAccountFieldEditScreen = React.forwardRef<
  { scrollToEnd(): void },
  React.PropsWithChildren<{
    title: string
    canSave: boolean
    contentContainerStyle?: ViewStyle
    onSave(dismiss: () => void): Promise<any>
  }>
>(({ children, canSave, onSave, title, contentContainerStyle }, ref) => {
  const [isSaving, setIsSaving] = useState<boolean>(false)
  const scrollViewRef = useRef<ScrollView>(null)

  const onDismiss = () => {
    SwitchBoard.dismissNavigationViewController(scrollViewRef.current!)
  }

  const handleSave = async () => {
    if (!canSave) {
      return
    }
    try {
      setIsSaving(true)
      await onSave(onDismiss)
    } catch (e) {
      console.error(e)
    } finally {
      setIsSaving(false)
    }
  }

  useImperativeHandle(
    ref,
    () => {
      return {
        scrollToEnd() {
          scrollViewRef.current?.scrollToEnd()
        },
        async save() {
          await handleSave()
        },
      }
    },
    []
  )

  return (
    <KeyboardAvoidingView behavior="padding" style={{ flex: 1 }}>
      <PageWithSimpleHeader
        left={
          <TouchableOpacity onPress={onDismiss}>
            <Sans size="4" textAlign="left">
              Cancel
            </Sans>
          </TouchableOpacity>
        }
        title={title}
        right={
          <TouchableOpacity disabled={!canSave} onPress={handleSave}>
            <Sans size="4" opacity={!canSave ? 0.3 : 1}>
              Save
            </Sans>
          </TouchableOpacity>
        }
      >
        <ScrollView
          contentContainerStyle={[{ padding: 20, paddingBottom: 50 }, contentContainerStyle]}
          ref={scrollViewRef}
          keyboardDismissMode="on-drag"
          keyboardShouldPersistTaps="handled"
        >
          <LoadingModal isVisible={isSaving} />
          {children}
        </ScrollView>
      </PageWithSimpleHeader>
    </KeyboardAvoidingView>
  )
})

export const MyAccountFieldEditScreenPlaceholder: React.FC<{ title: string }> = ({ children, title }) => {
  return (
    <MyAccountFieldEditScreen canSave={false} title={title} onSave={async () => null}>
      {children}
    </MyAccountFieldEditScreen>
  )
}
