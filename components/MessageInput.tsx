import React, { useState, useRef, useEffect } from 'react';
import { Send, Paperclip, Mic, Image as ImageIcon, Smile } from 'lucide-react';

interface MessageInputProps {
  onSendMessage: (text: string, file?: File) => void;
  disabled?: boolean;
  placeholder?: string;
}

const MessageInput: React.FC<MessageInputProps> = ({ onSendMessage, disabled, placeholder }) => {
  const [text, setText] = useState('');
  const [isFocused, setIsFocused] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 150) + 'px';
    }
  }, [text]);

  const handleSend = () => {
    if (text.trim() || fileInputRef.current?.files?.length) {
      onSendMessage(text, fileInputRef.current?.files?.[0]);
      setText('');
      if (textareaRef.current) textareaRef.current.style.height = 'auto';
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="p-4 bg-white border-t border-gray-200">
      <div 
        className={`
            flex flex-col bg-gray-50 border rounded-2xl transition-all duration-200
            ${isFocused ? 'border-indigo-500 ring-1 ring-indigo-500 shadow-sm bg-white' : 'border-gray-300'}
        `}
      >
        <textarea
          ref={textareaRef}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          placeholder={placeholder || "Nhập tin nhắn..."}
          disabled={disabled}
          className="w-full bg-transparent border-none focus:ring-0 resize-none px-4 py-3 max-h-40 text-sm text-gray-800 placeholder-gray-400"
          rows={1}
        />
        
        <div className="flex items-center justify-between px-2 pb-2">
            <div className="flex items-center space-x-1">
                 <input 
                    type="file" 
                    ref={fileInputRef} 
                    className="hidden" 
                    onChange={() => {
                        // Visual feedback for file selection could go here
                        if(fileInputRef.current?.files?.length) {
                             setText(prev => prev + ` [Đính kèm: ${fileInputRef.current?.files?.[0].name}] `);
                        }
                    }}
                 />
                 <button 
                    onClick={() => fileInputRef.current?.click()}
                    className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-200/50 rounded-full transition-colors" 
                    title="Đính kèm file"
                 >
                    <Paperclip size={18} />
                 </button>
                 <button className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-200/50 rounded-full transition-colors hidden sm:block">
                    <ImageIcon size={18} />
                 </button>
                 <button className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-200/50 rounded-full transition-colors hidden sm:block">
                    <Smile size={18} />
                 </button>
            </div>
            
            <button
                onClick={handleSend}
                disabled={!text.trim() || disabled}
                className={`
                    p-2 rounded-xl flex items-center justify-center transition-all duration-200
                    ${text.trim() 
                        ? 'bg-indigo-600 text-white shadow-md hover:bg-indigo-700 transform hover:scale-105 active:scale-95' 
                        : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                    }
                `}
            >
                <Send size={18} />
            </button>
        </div>
      </div>
      <div className="text-center mt-2">
          <p className="text-[10px] text-gray-400">
            <strong>Enter</strong> để gửi, <strong>Shift + Enter</strong> để xuống dòng.
          </p>
      </div>
    </div>
  );
};

export default MessageInput;