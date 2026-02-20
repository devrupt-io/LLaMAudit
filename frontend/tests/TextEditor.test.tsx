import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import TextEditor from '@/components/TextEditor';

describe('TextEditor', () => {
  it('renders textarea with placeholder', () => {
    render(<TextEditor value="" onChange={() => {}} />);
    expect(screen.getByPlaceholderText(/paste your text/i)).toBeInTheDocument();
  });

  it('displays the provided value', () => {
    render(<TextEditor value="Hello world" onChange={() => {}} />);
    const textarea = screen.getByRole('textbox') as HTMLTextAreaElement;
    expect(textarea.value).toBe('Hello world');
  });

  it('calls onChange when text is entered', () => {
    const handleChange = jest.fn();
    render(<TextEditor value="" onChange={handleChange} />);
    const textarea = screen.getByRole('textbox');
    fireEvent.change(textarea, { target: { value: 'new text' } });
    expect(handleChange).toHaveBeenCalledWith('new text');
  });

  it('shows clear button when text exists', () => {
    render(<TextEditor value="some text" onChange={() => {}} />);
    expect(screen.getByText(/clear/i)).toBeInTheDocument();
  });

  it('hides clear button when empty', () => {
    render(<TextEditor value="" onChange={() => {}} />);
    expect(screen.queryByText(/clear/i)).not.toBeInTheDocument();
  });

  it('shows import document button', () => {
    render(<TextEditor value="" onChange={() => {}} />);
    expect(screen.getByText(/import document/i)).toBeInTheDocument();
  });
});
