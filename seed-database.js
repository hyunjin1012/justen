// Simple script to seed the database

async function seedDatabase() {
  try {
    console.log('🌱 Starting database seeding...');
    
    const response = await fetch('http://localhost:3001/api/seed', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ totalBooks: 300 }) // Custom number of books
    });
    
    const result = await response.json();
    
    if (response.ok) {
      console.log('✅ Database seeded successfully!');
      console.log(`📚 Books added: ${result.booksCount}`);
    } else {
      console.error('❌ Seeding failed:', result.error);
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

seedDatabase();
