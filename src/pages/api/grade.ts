import type { NextApiRequest, NextApiResponse } from 'next';
import { Configuration, OpenAIApi } from 'openai';
import { GradeRequest, GradeResponse, ErrorResponse } from '../../types';

const configuration = new Configuration({
  apiKey: process.env.GPT4_API_KEY,
});
const openai = new OpenAIApi(configuration);

async function callGPT4(prompt: string): Promise<string | undefined> {
  console.log("Beginning call to GPT-4")
  console.log(prompt)
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
      console.log("GPT-4 response received")
      console.log(response.data.choices[0].message)
      return response.data.choices[0].message?.content.trim();
    } else {
      throw new Error('No response from GPT-4');
    }
  } catch (error) {
    console.error('Error calling GPT-4:', error);
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
Start by giving specific feedback on the essay, and end by assigning the letter grade. Your feedback should include
around 3 specific passages the student did poorly, with examples of how to improve those passages. It should also include at least
a few positive comments on the essay. The letter grade should be a single letter, and should be one of A, B, C, D, or F (+/-).

Essay prompt: ${essayPrompt}

${samples.map((sample) => `Example: ${sample.text}\nGrade: ${sample.grade}`).join('\n\n')}
    
Now grade the following essay (format with markdown):\n\n${essayText}`;      

    const grade = await callGPT4(prompt);

    if (!grade) {
      throw new Error('No response from GPT-4');
    }

    res.status(200).json({ grade });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'An error occurred while grading the essay.' });
  }
}
