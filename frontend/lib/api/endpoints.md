# API Endpoints Documentation

## Base URL
```
http://localhost:3001/api
```

## Available Endpoints

### 1. Health Check
- **GET** `/health`
- **Response**: `{ status: "ok" }`

### 2. Get All Books
- **GET** `/books`
- **Response**: 
```json
{
  "books": [
    {
      "id": "genesis",
      "name": "Genesis",
      "testament": "old"
    }
  ]
}
```

### 3. Get Chapters for Book
- **GET** `/books/{bookId}/chapters`
- **Response**:
```json
{
  "chapters": 50,
  "bookName": "Genesis"
}
```

### 4. Get Chapter Content
- **GET** `/books/{bookId}/chapters/{chapterNumber}`
- **Response**:
```json
{
  "book": "Genesis",
  "chapter": 1,
  "verses": [
    {
      "number": 1,
      "text": "In the beginning God created the heavens and the earth."
    }
  ]
}
```

### 5. Generate Report
- **POST** `/reports/generate`
- **Body**:
```json
{
  "bookId": "genesis",
  "chapter": 1,
  "verses": "1-3"
}
```
- **Response**:
```json
{
  "id": "report-uuid",
  "status": "processing"
}
```

### 6. Get Report Status
- **GET** `/reports/{reportId}`
- **Response**:
```json
{
  "id": "report-uuid",
  "status": "completed",
  "content": "# Report Content\n\nMarkdown content here..."
}
```

## Error Responses
All endpoints may return:
```json
{
  "error": "Error message",
  "statusCode": 400
}
```

## Notes
- All responses are in JSON format
- NIV translation only for MVP
- Rate limiting may apply to report generation
- Reports are processed asynchronously