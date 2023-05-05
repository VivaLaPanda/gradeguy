// This is an app for using GPT-4 to grade papers
// - Provide a 1-page UI
//   - The UI lets the user input a couple of samples of writing alongside a grade for that writing (this should be in a small bar on the top of the page that can be minimized)
//   - The body of the page should be a large two-column layout
//   - The right column should give a large text editor where the user can enter the text of an essay they want graded
//   - There should be a button to grade the essay, and on the left column we'll show the output of GPT-4's grading
// - You'll need to make the actual calls to GPT-4 on the server not the client, and store the API keys in fly.dev secrets/environment variables
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import styled from '@emotion/styled';
import { GradeRequest, GradeResponse, ErrorResponse } from '../types';
import ReactMarkdown from 'react-markdown';
import logger from '../logger';

const LOCAL_STORAGE_SAMPLES_KEY = 'samples';


interface SampleContainerProps {
  show: boolean;
}

const Container = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  flex-direction: column;
  height: 100vh;
  width: 100%;
  overflow: hidden; // Add this line to fix the overflow issue
`;


const SampleContainer = styled.div<SampleContainerProps>`
  display: flex;
  flex-wrap: wrap;
  flex-direction: column;
  height: ${({ show }) => (show ? '80vh' : '0')};
  max-height: 100vh;
  transition: max-height 0.5s ease-in-out;
  width: 100%;
`;

const SampleEditors = styled.div`
  display: flex;
  flex-wrap: wrap;
  width: 100%;
  height: 70%;
`;

const AddSampleButtonContainer = styled.div`
  display: flex;
  justify-content: center;
  width: 100%;
`;

const SampleTextEditor = styled.textarea`
  flex: 1;
  resize: none;
  height: calc(80vh - 80px); 
  width: 100%;
  margin-bottom: 8px;
`;

const GradeSample = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  margin-right: 16px;
  width: 20%;
  box-sizing: border-box;
`;

const TwoColumnLayout = styled.div`
  display: flex;
  flex-direction: row;
  width: 100vw;
  height: calc(80vh); 
  margin-top: 16px;
`;


const TextEditor = styled.textarea`
  flex: 1;
  resize: none;
  height: 100%;
  margin-right: 16px;
  padding: 16px;
  box-sizing: border-box;
`;

const GradingOutput = styled.div`
  flex: 1;
  padding: 16px;
  border-width: 1px;
  border-style: solid;
  border-color: -internal-light-dark(rgb(118, 118, 118), rgb(133, 133, 133));
  border-radius: 4px;
  height: 100%;
  overflow-y: scroll;
  box-sizing: border-box;
`;

const EssayPromptContainer = styled.div`
  width: 100%;
  padding-right: 16px;
  box-sizing: border-box;
`;

const EssayPromptInput = styled.input`
  width: 100%;
  padding: 8px;
  margin-bottom: 16px;
`;


const gradeOptions = [
  'F', 'D-', 'D', 'D+', 'C-', 'C', 'C+', 'B-', 'B', 'B+', 'A-', 'A', 'A+'
];

export default function Home() {
  const [samples, setSamples] = useState<Array<{ text: string; grade: string }>>([]);
  const [showSamples, setShowSamples] = useState(true);
  const [essayText, setEssayText] = useState('');
  const [gradingOutput, setGradingOutput] = useState('');
  const [essayPrompt, setEssayPrompt] = useState('');
  const [isLoading, setIsLoading] = useState(false);


  // Load samples from local storage on component mount
  useEffect(() => {
    const storedSamples = localStorage.getItem(LOCAL_STORAGE_SAMPLES_KEY);
    if (storedSamples) {
      setSamples(JSON.parse(storedSamples));
    }
  }, []);

  // Update local storage whenever samples change
  useEffect(() => {
    localStorage.setItem(LOCAL_STORAGE_SAMPLES_KEY, JSON.stringify(samples));
  }, [samples]);

  const addSample = () => {
    setSamples([...samples, { text: '', grade: '' }]);
  };

  const deleteSample = (index: number) => {
    setSamples(samples.filter((_, i) => i !== index));
  };

  const gradeEssay = async () => {
    try {
      setIsLoading(true);
      const requestData: GradeRequest = {
        samples,
        essayText,
        essayPrompt,
      };
      const response = await axios.post('/api/grade', requestData);
      // type
      if ((response.data as ErrorResponse).error) {
        logger.error((response.data as ErrorResponse).error);
        return;
      }
      logger.info({ message: "Grading output: ", data: response.data });
      setGradingOutput((response.data as GradeResponse).grade);
    } catch (error) {
      logger.error({ message: "Error grading essay", error });
    } finally {
      setIsLoading(false);
    }
  };
  

  return (
    <Container>
      <button onClick={() => setShowSamples(!showSamples)}>
        {showSamples ? 'Hide Samples' : 'Show Samples'}
      </button>
      <SampleContainer show={showSamples}>
        <EssayPromptContainer>
          <EssayPromptInput
            placeholder="Enter the essay prompt here..."
            value={essayPrompt}
            onChange={(e) => setEssayPrompt(e.target.value)}
          />
        </EssayPromptContainer>

        <SampleEditors>
          {samples.map((sample, index) => (
            <GradeSample key={index}>
              <SampleTextEditor
                value={sample.text}
                onChange={(e) => {
                  const newSamples = [...samples];
                  newSamples[index].text = e.target.value;
                  setSamples(newSamples);
                }}
              />
              <select
                value={sample.grade}
                onChange={(e) => {
                  const newSamples = [...samples];
                  newSamples[index].grade = e.target.value;
                  setSamples(newSamples);
                }}
              >
                {gradeOptions.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
              <button onClick={() => deleteSample(index)}>Delete Sample</button>
            </GradeSample>
          ))}
        </SampleEditors>
        <AddSampleButtonContainer>
          <button onClick={addSample}>Add Sample</button>
        </AddSampleButtonContainer>
      </SampleContainer>
      <TwoColumnLayout>
        <TextEditor
          placeholder="Enter the text of the essay you want to grade here..."
          value={essayText}
          onChange={(e) => setEssayText(e.target.value)}
        />
        <GradingOutput>
          <ReactMarkdown>{gradingOutput}</ReactMarkdown>
        </GradingOutput>
      </TwoColumnLayout>
      <button onClick={gradeEssay} disabled={isLoading}>
        {isLoading ? 'Grading...' : 'Grade Essay'}
      </button>
    </Container>
  );
}