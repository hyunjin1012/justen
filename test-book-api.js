// Test script for the book content API
const testBookContent = async () => {
  try {
    console.log('Testing book content API...');
    
    // Test with Frankenstein (ID: 84)
    const response = await fetch('http://localhost:3001/api/book-content?id=84');
    const data = await response.json();
    
    if (response.ok) {
      console.log('✅ API Response successful');
      console.log('📖 Book Title:', data.data.metadata.title);
      console.log('👤 Author:', data.data.metadata.authors[0].name);
      console.log('📄 Content length:', data.data.content.length, 'characters');
      console.log('🔗 Text URL:', data.data.textUrl);
    } else {
      console.log('❌ API Error:', data.error);
    }
  } catch (error) {
    console.log('❌ Network Error:', error.message);
  }
};

testBookContent();
