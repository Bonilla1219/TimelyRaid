# API Service Documentation

## MetaForge ARC Raiders Events Schedule API

This service provides integration with the MetaForge ARC Raiders events schedule API.

### Features

- **Single endpoint**: One API call fetches all events
- **24-hour cache**: Responses are cached for 24 hours to minimize API calls
- **Retry logic**: Exponential backoff on failures (2 attempts)
- **TypeScript types**: Full type definitions for API responses

### Usage

```typescript
import { getEventsSchedule, clearEventsCache } from '@/services/api';

// Fetch events (uses cache if within 24 hours)
const response = await getEventsSchedule();
// response.data is ScheduleEvent[]

// Force a fresh fetch (e.g. on user refresh)
clearEventsCache();
const fresh = await getEventsSchedule();
```

### Using the React Hook

```typescript
import { useEventTimers } from '@/hooks/use-event-timers';

function HomeScreen() {
  const { mapTimers, loading, error, refetch } = useEventTimers();

  if (loading) return <Text>Loading...</Text>;
  if (error) return <Text>Error: {error.message}</Text>;

  return (
    <View>
      {mapTimers.map((section) => (
        <View key={section.map}>
          <Text>{section.mapDisplayName}</Text>
          {section.timers.map((timer) => (
            <EventTimer key={timer.id} timer={timer} />
          ))}
        </View>
      ))}
    </View>
  );
}
```

### API Endpoint

- `GET https://metaforge.app/api/arc-raiders/events-schedule` - Returns all events with name, map, icon, startTime, endTime

### Response Shape

```json
{
  "data": [
    {
      "name": "Harvester",
      "map": "Spaceport",
      "icon": "https://cdn.metaforge.app/arc-raiders/custom/harvester.webp",
      "startTime": 1771545600000,
      "endTime": 1771549200000
    }
  ],
  "cachedAt": 1771555872360
}
```

### Attribution

According to MetaForge API terms, include attribution and a link to [metaforge.app/arc-raiders](https://metaforge.app/arc-raiders) when using this API in a public project. The home screen includes this attribution.
