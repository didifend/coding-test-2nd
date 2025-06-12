import React, { useState } from 'react';
import styles from '../styles/ChatInterface.module.css';
import { ChatMessage } from '../types/chat';
interface ChatInterfaceProps {
  messages: ChatMessage[];
  onSendMessage: (message: string) => Promise<void>;
  placeholder?: string;
  isLoading?: boolean;
}

export default function ChatInterface({
  messages,
  onSendMessage,
  placeholder = "Type your message...",
  isLoading = false
}: ChatInterfaceProps) {
  const [input, setInput] = useState('');

  const handleSendMessage = async () => {
    if (!input.trim() || isLoading) return;
    await onSendMessage(input);
    setInput('');
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.messages}>
        {messages.map((message) => (
          <div 
            key={message.id} 
            className={`${styles.message} ${styles[message.type]}`}
          >
            <div className={styles.messageContent}>
              {message.content}
            </div>
            {message.sources && message.sources.length > 0 && (
              <div className={styles.sources}>
                <strong>Sources:</strong>
                <ul>
                  {message.sources.map((source, index) => (
                    <li key={index}>
                      {source.title || source.url}
                      {source.page && ` (page ${source.page})`}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        ))}
        {isLoading && (
          <div className={`${styles.message} ${styles.assistant}`}>
            <div className={`${styles.messageContent} ${styles.typingIndicator}`}>
              <span></span>
              <span></span>
              <span></span>
            </div>
          </div>
        )}
      </div>

      <div className={styles.inputArea}>
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyPress={handleKeyPress}
          placeholder={placeholder}
          disabled={isLoading}
          className={styles.input}
        />
        <button 
          onClick={handleSendMessage}
          disabled={!input.trim() || isLoading}
          className={styles.button}
        >
          {isLoading ? 'Sending...' : 'Send'}
        </button>
      </div>
    </div>
  );
}