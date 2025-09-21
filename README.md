# Gutenberg Search

A semantic search application for discovering books from Project Gutenberg using natural language queries. Built with Next.js, OpenAI embeddings, and modern web technologies.

## Features

- **Semantic Search**: Find books using natural language queries like "I want to find a book that features a British king"
- **AI-Powered**: Uses OpenAI's text embeddings for intelligent book matching
- **Modern UI**: Clean, responsive interface with dark mode support
- **Real-time Results**: Fast search with relevance scoring
- **Direct Links**: Access books directly on Project Gutenberg

## Getting Started

### Prerequisites

- Node.js 18+ 
- OpenAI API key

### Installation

1. Clone the repository:
```bash
git clone <your-repo-url>
cd justen
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
Create a `.env.local` file in the root directory:
```bash
OPENAI_API_KEY=your_openai_api_key_here
```

Get your OpenAI API key from [https://platform.openai.com/api-keys](https://platform.openai.com/api-keys)

4. Run the development server:
```bash
npm run dev
```

5. Open [http://localhost:3000](http://localhost:3000) in your browser

## How It Works

1. **Book Database**: The app includes a curated set of popular books from Project Gutenberg with detailed descriptions
2. **Embeddings**: Each book's title, author, and description are converted into vector embeddings using OpenAI's text-embedding-3-small model
3. **Semantic Search**: User queries are also converted to embeddings and compared using cosine similarity
4. **Results**: The top 10 most relevant books are returned with similarity scores

## Example Queries

- "Books about British kings and royalty" → Macbeth, Hamlet
- "Stories with magical adventures" → Alice's Adventures in Wonderland
- "Classic detective mysteries" → The Adventures of Sherlock Holmes
- "Adventure tales on the high seas" → Treasure Island

## Technology Stack

- **Frontend**: Next.js 15, React 19, TypeScript
- **Styling**: Tailwind CSS
- **AI**: OpenAI API (text-embedding-3-small)
- **Icons**: Lucide React
- **Vector Similarity**: cosine-similarity library

## Project Structure

```
src/
├── app/
│   ├── api/search/route.ts    # Search API endpoint
│   ├── page.tsx               # Main search interface
│   ├── layout.tsx             # App layout
│   └── globals.css            # Global styles
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

This project is open source and available under the MIT License.
