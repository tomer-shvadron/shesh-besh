import { chooseMove } from '@/ai/aiPlayer';
import type { AiRequest, AiResponse } from '@/ai/types';
import { Board } from '@/engine/board';

self.onmessage = (e: MessageEvent<AiRequest>): void => {
  const { board, player, dice, difficulty } = e.data;
  const boardInstance = Board.fromState(board);
  const moves = chooseMove(boardInstance, player, dice, difficulty);
  const response: AiResponse = { moves };
  self.postMessage(response);
};
