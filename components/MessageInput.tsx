import React, { useState, useRef, useEffect } from 'react';
import { Send, Paperclip, Image as ImageIcon, Smile, MoreHorizontal } from 'lucide-react';

interface MessageInputProps {
  onSendMessage: (text: string, file?: File) => void;
  disabled?: boolean;
  placeholder?: string;
}

const MessageInput: React.FC<MessageInputProps> = ({ onSendMessage, disabled, placeholder }) => {
  const [text, setText] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'; // Reset height
      textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 120) + 'px';
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
    <div className="bg-white border-t border-gray-200 px-3 py-2 safe-bottom">
      <div className="flex items-end space-x-2">
          {/* Tool buttons */}
          <div className="flex items-center pb-2 space-x-1 sm:space-x-2 text-gray-500">
             <button className="p-2 hover:bg-gray-100 rounded-full transition-colors hidden sm:block">
                <Smile size={24} />
             </button>
             <button 
                onClick={() => fileInputRef.current?.click()}
                className="p-2 hover:bg-gray-100 rounded-full transition-colors"
             >
                <ImageIcon size={24} />
             </button>
             <button 
                onClick={() => fileInputRef.current?.click()}
                className="p-2 hover:bg-gray-100 rounded-full transition-colors"
             >
                <Paperclip size={22} />
             </button>
             <input 
                type="file" 
                ref={fileInputRef} 
                className="hidden" 
                onChange={() => {
                    if(fileInputRef.current?.files?.length) {
                         setText(prev => prev + ` [File: ${fileInputRef.current?.files?.[0].name}] `);
                    }
                }}
             />
          </div>

          {/* Input Area */}
          <div className="flex-1 bg-white">
              <textarea
                ref={textareaRef}
                value={text}
                onChange={(e) => setText(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={placeholder || "Nhập tin nhắn @..."}
                disabled={disabled}
                rows={1}
                className="w-full bg-gray-50 border border-transparent focus:border-blue-300 focus:bg-white focus:ring-2 focus:ring-blue-100 rounded-xl px-4 py-2.5 text-[15px] resize-none text-gray-800 placeholder-gray-400 transition-all"
                style={{ maxHeight: '120px' }}
              />
          </div>

          {/* Send Button */}
          <div className="pb-1">
             <button
                onClick={handleSend}
                disabled={!text.trim() && !fileInputRef.current?.files?.length || disabled}
                className={`
                    p-2.5 rounded-xl flex items-center justify-center transition-all
                    ${text.trim() || fileInputRef.current?.files?.length
                        ? 'bg-[#0068ff] text-white shadow-md hover:bg-blue-600' 
                        : 'text-[#0068ff] hover:bg-blue-50'
                    }
                `}
            >
                <Send size={20} className={text.trim() ? "ml-0.5" : ""} />
            </button>
          </div>
      </div>
    </div>
  );
};

export default MessageInput;