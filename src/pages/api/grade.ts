import type { NextApiRequest, NextApiResponse } from 'next';
import { Configuration, OpenAIApi } from 'openai';
import { GradeRequest, GradeResponse, ErrorResponse } from '../../types';
import logger from '../../logger';

const configuration = new Configuration({
  apiKey: process.env.GPT4_API_KEY,
});
const openai = new OpenAIApi(configuration);

async function callGPT4(prompt: string): Promise<string | undefined> {
  logger.info({ message: "Beginning call to GPT-4", data: { prompt } });
  try {
    const response = await openai.createChatCompletion({
      model: 'gpt-4',
      messages: [
        { role: 'user', content: prompt },
      ],
    });

    if (response.status === 429) {
      // Wait for 1 second and try again
      await new Promise((resolve) => setTimeout(resolve, 1000));
      return await callGPT4(prompt);
    }

    if (response.data.choices && response.data.choices.length > 0) {
      logger.info({ message: "GPT-4 response received", data: { response: response.data.choices[0].message } });
      return response.data.choices[0].message?.content.trim();
    } else {
      throw new Error('No response from GPT-4');
    }
  } catch (error) {
    logger.error({ message: "Error calling GPT-4", error });
    throw error;
  }
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<GradeResponse | ErrorResponse>
) {
  const requestData: GradeRequest = req.body;
  const { samples, essayText, essayPrompt } = requestData;

  try {
    const prompt = `I want you to grade some essays by 8th grade students. 
You should generally grade in a harsh but fair manner. I will give you some examples of writing and the grade those got first, and then you can use those as references to guide your grading.
Start by giving specific feedback on the essay, and end by assigning the letter grade.
Your feedback should start with at least a few positive comments on the essay.
Your feedback should then include around 3 specific passages the student did poorly, with examples of how to improve those passages.
Make sure to check that the essay has a strong overall flow (e.g. a clear beginning, middle, and conclusion). If it doesn't, make sure to mention that.
The letter grade should be a single letter, and should be one of A, B, C, D, or F (+/-).

Essay prompt: ${essayPrompt}

${samples.map((sample) => `Example: ${sample.text}\nGrade: ${sample.grade}`).join('\n\n')}
    
Now grade the following essay (format with markdown):\n\n${essayText}`;      

    const grade = await callGPT4(prompt);

    if (!grade) {
      throw new Error('No response from GPT-4');
    }

    res.status(200).json({ grade });
  } catch (error) {
    logger.error({ message: "Error grading essay", error });
    res.status(500).json({ error: 'An error occurred while grading the essay.' });
  }
}
