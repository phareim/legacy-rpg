export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const { world = 'main', x = '0', y = '0' } = query

  const coordinates = {
    x: parseInt(x as string, 10),
    y: parseInt(y as string, 10)
  }

  if (isNaN(coordinates.x) || isNaN(coordinates.y)) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Invalid coordinates. X and Y must be numbers.'
    })
  }

  try {
    // TODO: Fetch actual location from Firebase
    // For now, return mock location data based on coordinates
    let locationData

    if (coordinates.x === 0 && coordinates.y === 0) {
      locationData = {
        name: 'starting meadow',
        description: 'A peaceful meadow where your journey begins. You can see a path leading ***north*** to the village.',
        coordinates,
        objects: [],
        npcs: [],
        evolution_trigger: ''
      }
    } else if (coordinates.x === 0 && coordinates.y === 1) {
      locationData = {
        name: 'village square',
        description: 'A bustling village square with merchants and travelers. An old *well* sits in the center, and you notice **the village elder** watching the crowd.',
        coordinates,
        objects: ['well'],
        npcs: ['village elder'],
        evolution_trigger: ''
      }
    } else {
      locationData = {
        name: 'unknown territory',
        description: 'You find yourself in unexplored lands. The terrain is rough and unfamiliar.',
        coordinates,
        objects: [],
        npcs: [],
        evolution_trigger: ''
      }
    }

    return {
      success: true,
      data: locationData
    }
  } catch (error) {
    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to retrieve location data'
    })
  }
})