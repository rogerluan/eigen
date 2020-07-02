import { CheckIcon, CloseIcon, color, Flex, Sans, Separator } from "@artsy/palette"
import { Autocomplete } from "lib/utils/Autocomplete"
import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react"
import { Animated, FlatList, TouchableHighlight, TouchableOpacity } from "react-native"
import Svg, { Path } from "react-native-svg"
// @ts-ignore
import TextInputState from "react-native/Libraries/Components/TextInput/TextInputState"
import { FancyModal } from "./FancyModal"
import { INPUT_HEIGHT } from "./Input/Input"
import { SearchInput } from "./SearchInput"

export interface SelectOption<ValueType> {
  value: ValueType
  label: NonNullable<React.ReactNode>
  searchTerms?: string[]
  searchImportance?: number
}

const ROW_HEIGHT = 40
interface SelectProps<ValueType> {
  options: Array<SelectOption<ValueType>>
  value: ValueType | null
  placeholder: string
  title: string
  enableSearch?: boolean
  onSelectValue(value: ValueType): void
}
interface State {
  showingModal: boolean
}
export class Select<ValueType> extends React.Component<SelectProps<ValueType>, State> {
  state: State = { showingModal: false }

  async open() {
    // tinkering with RN internals here to make sure that when this select is tapped we blur
    // any text input that was focuesd at the time.
    if (TextInputState.currentlyFocusedField()) {
      TextInputState.blurTextInput(TextInputState.currentlyFocusedField())
      await new Promise(r => requestAnimationFrame(r))
    }
    await new Promise(r => this.setState({ showingModal: true }, r))
  }

  close() {
    this.setState({ showingModal: false })
  }

  render() {
    const { options, onSelectValue, value, placeholder, enableSearch, title } = this.props

    const selectedItem = options.find(o => o.value === value)
    return (
      <>
        <SelectButton
          title={title}
          placeholder={placeholder}
          value={selectedItem?.label}
          onPress={this.open.bind(this)}
        />
        <SelectModal
          visible={this.state.showingModal}
          title={title}
          enableSearch={enableSearch}
          value={value}
          options={options}
          onDismiss={this.close.bind(this)}
          onSelectValue={onSelectValue}
        />
      </>
    )
  }
}

const SelectButton: React.FC<{
  value?: React.ReactNode
  title?: string
  placeholder: string
  onPress(): any
}> = ({ value, placeholder, onPress, title }) => {
  return (
    <Flex>
      {!!title && (
        <Sans mb={0.5} size="3">
          {title}
        </Sans>
      )}
      <TouchableOpacity accessible accessibilityRole="button" onPress={onPress}>
        <Flex
          px="1"
          flexDirection="row"
          height={INPUT_HEIGHT}
          borderWidth={1}
          borderColor={color("black10")}
          justifyContent="space-between"
          alignItems="center"
        >
          {value ? (
            <Sans size="3t">{value}</Sans>
          ) : (
            <Sans size="3t" color="black60">
              {placeholder}
            </Sans>
          )}
          {/* triangle pointing down */}
          <Svg width="11" height="6" viewBox="0 0 11 6" fill="none">
            <Path fillRule="evenodd" clip-rule="evenodd" d="M5.5 6L0 0L11 0L5.5 6Z" fill="black" />
          </Svg>
        </Flex>
      </TouchableOpacity>
    </Flex>
  )
}

const SelectModal: React.FC<{
  options: Array<SelectOption<unknown>>
  value: unknown | null
  title: string
  enableSearch?: boolean
  visible: boolean
  onDismiss(): any
  onSelectValue(value: unknown): any
}> = props => {
  // we need to be able to have a local version of the value state so we can show the updated
  // state between the moment the user taps a selection and the moment we automatically
  // close the modal. We don't want to tell the consuming component about the user's selection until the
  // animation is finished, so they don't have to worry about waiting for the animation to finish if they need
  // to trigger further actions as a result.
  const [localValue, setValue] = useState(props.value)
  useEffect(() => {
    setValue(props.value)
  }, [props.value])

  const selectedItem = props.options.find(o => o.value === localValue)

  const autocomplete = useMemo(() => {
    return new Autocomplete<SelectOption<unknown>>(
      props.options.map(option => {
        if (!option.searchTerms || option.searchTerms.length === 0) {
          console.error("Option with empty search terms: " + JSON.stringify(option))
          return { searchTerms: [], importance: 0, key: option }
        }
        return { searchTerms: option.searchTerms, importance: option.searchImportance ?? 0, key: option }
      })
    )
  }, [props.enableSearch, props.options])

  const [searchTerm, setSearchTerm] = useState("")

  // reset the search term whenever visibility changes
  useEffect(() => {
    setSearchTerm("")
  }, [props.visible])

  const autocompleteResults = useMemo(() => {
    return searchTerm ? autocomplete.getSuggestions(searchTerm) : props.options
  }, [autocomplete, searchTerm])

  const flatListRef = useRef<FlatList>(null)
  const flatListHeight = useRef(0)

  // scroll to show the selected value whenever we either clear the
  // search input, or show the modal.
  useLayoutEffect(() => {
    if (props.visible && !searchTerm.trim() && selectedItem) {
      const initialScrollIndex = props.options.indexOf(selectedItem)
      // try to center the option on screen
      const initialScrollOffset = initialScrollIndex * ROW_HEIGHT - flatListHeight.current / 2 + ROW_HEIGHT
      requestAnimationFrame(() => {
        flatListRef.current?.scrollToOffset({ offset: initialScrollOffset, animated: false })
      })
    } else {
      requestAnimationFrame(() => {
        flatListRef.current?.scrollToOffset({ offset: 0, animated: false })
      })
    }
  }, [searchTerm, props.visible, selectedItem])
  return (
    <FancyModal visible={props.visible} onBackgroundPressed={props.onDismiss}>
      <Flex p="2" pb={15} flexDirection="row" alignItems="center" flexGrow={0}>
        <Flex flex={1}></Flex>
        <Flex flex={2} alignItems="center">
          <Sans size="4" weight="medium">
            {props.title}
          </Sans>
        </Flex>
        <TouchableOpacity
          onPress={props.onDismiss}
          hitSlop={{ top: 20, right: 20, bottom: 20, left: 20 }}
          style={{ flex: 1, alignItems: "flex-end" }}
        >
          <CloseIcon fill="black60" />
        </TouchableOpacity>
      </Flex>
      {!!props.enableSearch && (
        <Flex mb="1" mx="2">
          <SearchInput placeholder="Type to search..." onChangeText={setSearchTerm} />
        </Flex>
      )}
      <Separator />
      <FlatList
        ref={flatListRef}
        keyboardDismissMode="on-drag"
        keyboardShouldPersistTaps="handled"
        data={autocompleteResults}
        extraData={{ value: localValue }}
        keyExtractor={item => String(item.value)}
        windowSize={3}
        contentContainerStyle={{ paddingTop: 10, paddingBottom: 60 }}
        // we handle scrolling to the selected value ourselves because FlatList has weird
        // rendering bugs when initialScrollIndex changes, at the time of writing
        initialScrollIndex={undefined}
        getItemLayout={(_item, index) => ({ index, length: ROW_HEIGHT, offset: ROW_HEIGHT * index })}
        style={{ flex: 1 }}
        onLayout={e => (flatListHeight.current = e.nativeEvent.layout.height)}
        renderItem={({ item }) => (
          <TouchableHighlight
            underlayColor={color("black10")}
            onPress={() => {
              setValue(item.value)
              // give the pop-in animation a chance to play
              setTimeout(() => {
                props.onDismiss()
                props.onSelectValue(item.value)
              }, 400)
            }}
          >
            <Flex
              flexDirection="row"
              pl="2"
              pr={15}
              justifyContent="space-between"
              height={ROW_HEIGHT}
              alignItems="center"
              backgroundColor={localValue === item.value ? "black5" : "white"}
            >
              <Sans size="4">{item.label}</Sans>
              {localValue === item.value ? (
                <PopIn>
                  <CheckIcon width={25} height={25} />
                </PopIn>
              ) : null}
            </Flex>
          </TouchableHighlight>
        )}
      ></FlatList>
    </FancyModal>
  )
}

const PopIn: React.FC = ({ children }) => {
  const entranceProgress = useRef(new Animated.Value(0)).current
  useEffect(() => {
    Animated.spring(entranceProgress, { toValue: 1, bounciness: 10, speed: 18, useNativeDriver: true }).start()
  }, [])
  return (
    <Animated.View
      style={{
        opacity: entranceProgress,
        transform: [
          {
            scale: entranceProgress.interpolate({
              inputRange: [0, 1],
              outputRange: [0.5, 1],
            }),
          },
        ],
      }}
    >
      {children}
    </Animated.View>
  )
}
