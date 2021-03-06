import { FilterParamName } from "lib/Scenes/Collection/Helpers/FilterArtworksHelpers"
import { ArtworkFilterContext, FilterData, useSelectedOptionsDisplay } from "lib/utils/ArtworkFiltersStore"
import React, { useContext } from "react"
import { NavigatorIOS } from "react-native"
import { MultiSelectOptionScreen } from "./MultiSelectOption"

interface WaysToBuyOptionsScreenProps {
  navigator: NavigatorIOS
}

export const WaysToBuyOptionsScreen: React.SFC<WaysToBuyOptionsScreenProps> = ({ navigator }) => {
  const { dispatch } = useContext(ArtworkFilterContext)
  const selectedOptions = useSelectedOptionsDisplay()

  const waysToBuyFilterNames = [
    FilterParamName.waysToBuyBuy,
    FilterParamName.waysToBuyMakeOffer,
    FilterParamName.waysToBuyBid,
    FilterParamName.waysToBuyInquire,
  ]
  const waysToBuyOptions = selectedOptions.filter(value => waysToBuyFilterNames.includes(value.paramName))

  const waysToBuySort = (left: FilterData, right: FilterData): number => {
    const leftParam = left.paramName
    const rightParam = right.paramName
    if (waysToBuyFilterNames.indexOf(leftParam) < waysToBuyFilterNames.indexOf(rightParam)) {
      return -1
    } else {
      return 1
    }
  }

  const sortedOptions = waysToBuyOptions.sort(waysToBuySort)

  const selectOption = (option: FilterData) => {
    dispatch({
      type: "selectFilters",
      payload: {
        displayText: option.displayText,
        paramValue: option.paramValue,
        paramName: option.paramName,
      },
    })
  }

  return (
    <MultiSelectOptionScreen
      onSelect={selectOption}
      filterHeaderText="Ways to Buy"
      filterOptions={sortedOptions}
      navigator={navigator}
    />
  )
}
