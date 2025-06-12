import React, { useState } from 'react';
import Head from 'next/head';
import FileUpload from '../components/FileUpload';
import ChatInterface from '../components/ChatInterface';
import styles from '../styles/Home.module.css';
import { ChatMessage } from '../types/chat';

export default function Home() {
  const [documentId, setDocumentId] = useState<string | null>(null);
  const [documentName, setDocumentName] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);

  const handleUploadComplete = (result: any) => {
    setDocumentId(result.documentId);
    setDocumentName(result.documentName);
    setMessages([{
      type: 'assistant',
      content: `Document "${result.documentName}" has been uploaded successfully. You can now ask questions about it.`
    }]);
  };

  const handleUploadError = (error: string) => {
    setMessages([{
      type: 'assistant',
      content: `Upload error: ${error}`
    }]);
  };

  const handleChatSubmit = async (message: string) => {
    if (!documentId) {
      setMessages(prev => [...prev, {
        type: 'assistant',
        content: 'Please upload a document first before asking questions.'
      }]);
      return;
    }

    // Add user message to chat
    setMessages(prev => [...prev, { type: 'user', content: message }]);

    try {
      const response = await fetch('/api/query', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          documentId,
          question: message
        })
      });

      if (!response.ok) {
        throw new Error('Failed to get answer');
      }

      const data = await response.json();
      setMessages(prev => [...prev, { 
        type: 'assistant', 
        content: data.answer,
        sources: data.sources 
      }]);
    } catch (error) {
      setMessages(prev => [...prev, { 
        type: 'assistant', 
        content: 'Sorry, there was an error processing your question.'
      }]);
    }
  };

  return (
    <div className={styles.container}>
      <Head>
        <title>RAG-based Financial Q&A System</title>
        <meta name="description" content="AI-powered Q&A system for financial documents" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <main>
        <header className={styles.header}>
          <h1>RAG-based Financial Statement Q&A System</h1>
          <p>Upload financial documents and get AI-powered insights</p>
        </header>

        <div className={styles.contentGrid}>
          <section className={styles.uploadSection}>
            <h2>Upload Document</h2>
            <FileUpload 
              onUploadComplete={handleUploadComplete}
              onUploadError={handleUploadError}
            />
            {documentName && (
              <div className={styles.documentInfo}>
                <h3>Current Document:</h3>
                <p>{documentName}</p>
              </div>
            )}
          </section>

          <section className={styles.chatSection}>
            <h2>Ask Questions</h2>
            <ChatInterface 
              messages={messages}
              onSendMessage={handleChatSubmit}
              placeholder="Ask a question about the financial document..."
            />
          </section>
        </div>
      </main>
    </div>
  );
}