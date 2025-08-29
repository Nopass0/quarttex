import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function fillNumericIds() {
  console.log('Starting to fill numericId for existing users...')
  
  try {
    // Get all users without numericId or with numericId = 0
    const users = await prisma.user.findMany({
      where: {
        OR: [
          { numericId: null },
          { numericId: 0 }
        ]
      },
      orderBy: {
        createdAt: 'asc'
      }
    })
    
    console.log(`Found ${users.length} users without numericId`)
    
    // Get the highest existing numericId
    const highestUser = await prisma.user.findFirst({
      where: {
        numericId: {
          not: null,
          gt: 0
        }
      },
      orderBy: {
        numericId: 'desc'
      }
    })
    
    let nextId = (highestUser?.numericId || 0) + 1
    
    // Update each user with a unique numericId
    for (const user of users) {
      await prisma.user.update({
        where: { id: user.id },
        data: { numericId: nextId }
      })
      console.log(`Updated user ${user.email} with numericId: ${nextId}`)
      nextId++
    }
    
    console.log('Successfully filled all numericIds!')
    
  } catch (error) {
    console.error('Error filling numericIds:', error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

// Run the script
fillNumericIds()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })