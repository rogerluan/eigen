import * as Analytics from "@artsy/cohesion"
import { Box, Flex, Separator } from "@artsy/palette"
import { WorksForYou_me } from "__generated__/WorksForYou_me.graphql"
import { WorksForYouQuery } from "__generated__/WorksForYouQuery.graphql"
import { PageWithSimpleHeader } from "lib/Components/PageWithSimpleHeader"
import Spinner from "lib/Components/Spinner"
import { ZeroState } from "lib/Components/States/ZeroState"
import Notification from "lib/Components/WorksForYou/Notification"
import { PAGE_SIZE } from "lib/data/constants"
import { defaultEnvironment } from "lib/relay/createEnvironment"
import { extractNodes } from "lib/utils/extractNodes"
import renderWithLoadProgress from "lib/utils/renderWithLoadProgress"
import React from "react"
import { FlatList, NativeModules, RefreshControl } from "react-native"
import { createPaginationContainer, graphql, QueryRenderer, RelayPaginationProp } from "react-relay"
import { postEvent } from "../NativeModules/Events"

interface Props {
  relay: RelayPaginationProp
  me: WorksForYou_me
}

interface State {
  isRefreshing: boolean
  loadingContent: boolean
  width: number | null
}

export class WorksForYou extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props)

    this.state = {
      isRefreshing: false,
      loadingContent: false,
      width: null,
    }
  }

  componentDidMount() {
    // Update read status in gravity
    // @ts-ignore STRICTNESS_MIGRATION
    NativeModules.ARTemporaryAPIModule.markNotificationsRead(error => {
      if (error) {
        console.warn(error)
      } else {
        postEvent({
          name: "Notifications read",
          source_screen: Analytics.OwnerType.worksForYou,
        })
      }
    })
  }

  fetchNextPage = () => {
    if (!this.props.relay.hasMore() || this.props.relay.isLoading()) {
      return
    }
    this.setState({ loadingContent: true }, () => {
      this.props.relay.loadMore(PAGE_SIZE, error => {
        if (error) {
          console.error("WorksForYou.tsx", error.message)
        }

        this.setState({ loadingContent: false })
      })
    })
  }

  handleRefresh = () => {
    this.setState({ isRefreshing: true })
    this.props.relay.refetchConnection(PAGE_SIZE, error => {
      if (error) {
        console.error("WorksForYou.tsx #handleRefresh", error.message)
      }
      this.setState({ isRefreshing: false })
    })
  }

  render() {
    const notifications = extractNodes(this.props.me.followsAndSaves?.notifications)
    /* If showing the empty state, the ScrollView should have a {flex: 1} style so it can expand to fit the screen.
       otherwise, it should not use any flex growth.
    */
    return (
      <PageWithSimpleHeader title="New Works For You">
        <FlatList
          data={this.state.width === null ? [] : notifications}
          keyExtractor={item => item.id}
          refreshControl={<RefreshControl refreshing={this.state.isRefreshing} onRefresh={this.handleRefresh} />}
          onLayout={event => {
            this.setState({ width: event.nativeEvent.layout.width })
          }}
          renderItem={data => {
            return <Notification width={this.state.width!} notification={data.item} />
          }}
          onEndReached={this.fetchNextPage}
          ItemSeparatorComponent={() => (
            <Box px={2}>
              <Separator />
            </Box>
          )}
          ListFooterComponent={
            this.state.loadingContent
              ? () => (
                  <Box p={2} style={{ height: 50 }}>
                    <Flex style={{ flex: 1 }} flexDirection="row" justifyContent="center">
                      <Spinner />
                    </Flex>
                  </Box>
                )
              : null
          }
          ListEmptyComponent={
            this.state.width === null
              ? null
              : () => (
                  <ZeroState
                    title="You haven’t followed any artists yet."
                    subtitle="Follow artists to see new works that have been added to Artsy"
                  />
                )
          }
        />
      </PageWithSimpleHeader>
    )
  }
}

export const WorksForYouContainer = createPaginationContainer(
  WorksForYou,
  {
    me: graphql`
      fragment WorksForYou_me on Me
        @argumentDefinitions(
          count: { type: "Int", defaultValue: 10 }
          cursor: { type: "String" }
          sort: { type: "ArtworkSorts", defaultValue: PARTNER_UPDATED_AT_DESC }
        ) {
        followsAndSaves {
          notifications: bundledArtworksByArtistConnection(sort: $sort, first: $count, after: $cursor)
            @connection(key: "WorksForYou_notifications") {
            pageInfo {
              hasNextPage
              endCursor
            }
            edges {
              node {
                id
                ...Notification_notification
              }
            }
          }
        }
      }
    `,
  },
  {
    direction: "forward",
    getConnectionFromProps(props) {
      return props.me.followsAndSaves?.notifications
    },
    getFragmentVariables(prevVars, totalCount) {
      return {
        ...prevVars,
        count: totalCount,
      }
    },
    getVariables(_props, { count, cursor }, fragmentVariables) {
      return {
        // in most cases, for variables other than connection filters like
        // `first`, `after`, etc. you may want to use the previous values.
        ...fragmentVariables,
        count,
        cursor,
      }
    },
    query: graphql`
      query WorksForYouPaginationQuery($count: Int!, $cursor: String) {
        me {
          ...WorksForYou_me @arguments(count: $count, cursor: $cursor)
        }
      }
    `,
  }
)

export const WorksForYouQueryRenderer: React.FC = () => {
  return (
    <QueryRenderer<WorksForYouQuery>
      environment={defaultEnvironment}
      query={graphql`
        query WorksForYouQuery {
          me {
            ...WorksForYou_me
          }
        }
      `}
      variables={{}}
      render={renderWithLoadProgress(WorksForYouContainer)}
    />
  )
}
