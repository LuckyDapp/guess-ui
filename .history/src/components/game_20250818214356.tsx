import {Suspense, useContext, useRef} from "react";
import {Box, Button, TextField} from "@mui/material";
import {GameContext} from "../contexts/game-context.tsx";
import {GameIntro} from "./game-intro.tsx";
import {getContractAddress, gtnContract} from "../config.ts";
import {toast} from "react-hot-toast";
import {useContractMutation, useMutationEffect, useQueryErrorResetter, useChainId} from "@reactive-dot/react";
import {MutationError, pending} from "@reactive-dot/core";
import {ErrorBoundary, type FallbackProps} from "react-error-boundary";
import type {MutationEvent} from "@reactive-dot/react/src/contexts/mutation.tsx";
import {isPositiveNumber} from "../utils/number-utils.ts";


export function CurrentGame() {

    const { game, getAttempts} = useContext(GameContext);

    if (game == undefined){
        return (
            <Box sx={{padding:"50px 40px 0 40px"}} display={'flex'} justifyContent={'center'}>
                <div>No game yet</div>
            </Box>
        );
    }
    return (
        <Box sx={{padding:"50px 40px 0 40px"}} display={'flex'} justifyContent={'center'}>
            <div className="content-block">
                <div>Current game - Guess the number between {game?.min_number} and {game?.max_number}</div>
                <div>
                    <Box sx={{padding:"50px 40px 0 40px"}} display={'flex'} justifyContent={'center'}>
                        <div>
                            <ul>
                                {getAttempts().map(attempt => (
                                    <li key={attempt.attemptNumber}>
                                        {(() => {
                                            if (attempt.clue == undefined){
                                                return "Attempt " + attempt.attemptNumber + " - Waiting for the result for number " + attempt.guess;
                                            }
                                            if (attempt.clue.type == "Less"){
                                                return "Attempt " + attempt.attemptNumber + " - My number is less than " + attempt.guess;
                                            }
                                            if (attempt.clue.type == "More"){
                                                return "Attempt " + attempt.attemptNumber + " - My number is more than " + attempt.guess;
                                            }
                                            if (attempt.clue.type == "Found"){
                                                return "Attempt " + attempt.attemptNumber + " - Congrats, you found the number " + attempt.guess + " !";
                                            }
                                            return "";
                                        })()}

                                    </li>
                                ))}
                            </ul>
                        </div>
                    </Box>
                </div>
                <div>
                    <MakeGuess />
                </div>
            </div>
        </Box>
    );
}


export function MakeGuess() {

    const chainId = useChainId();
    const contractAddress = getContractAddress(chainId);
    const { refreshGuesses } = useContext(GameContext)

    const inputNumber = useRef('');

    const [_, makeGuess] = useContractMutation((mutate) =>
        mutate(gtnContract, contractAddress, "guess", {
            data: {"guess": inputNumber.current?.value},
        }),
    );

    const submit = async () => {
        const guessNumber = inputNumber.current?.value;

        console.log("Guess " + guessNumber);
        if (!isPositiveNumber(guessNumber)){
            toast.error("The input must be positive number");
            return;
        }
        makeGuess();
    };

    useMutationEffect(onMutationEvent(refreshGuesses));

    return (
        <Box sx={{padding:"50px 40px 0 40px"}} display={'flex'} justifyContent={'center'}>
            <div className="content-block">
            <TextField inputRef={inputNumber} sx={{margin:'0 20px 0 0'}} id="guess-number-value" label="Enter your number" variant="outlined" />
            <Button onClick={submit} variant="contained">Make a guess</Button>
            </div>
        </Box>
    );
}


function NewGame() {

    const chainId = useChainId();
    const contractAddress = getContractAddress(chainId);
    const { refreshGame } = useContext(GameContext)

    // @ts-ignore
    const refMin = useRef();
    // @ts-ignore
    const refMax = useRef();

    const [__, newGame] = useContractMutation((mutate) =>
        mutate(gtnContract, contractAddress, "start_new_game", {
            data: {"min_number": refMin.current?.value, "max_number": refMax.current?.value},
        }),
    );

    useMutationEffect(onMutationEvent(refreshGame));

    const submit = async () => {
        const minNumber = refMin.current?.value;
        const maxNumber = refMax.current?.value;

        console.log("Start new game " + minNumber + " - " + maxNumber);
        if (!isPositiveNumber(minNumber) || ! isPositiveNumber(maxNumber)){
            toast.error("Min and Max must be positive numbers");
            return;
        }
        if (minNumber >= maxNumber){
            toast.error("Min must be inferior to Max");
            return;
        }
        newGame();
    };

    return (
        <Box sx={{padding:"100px 40px 0 40px"}} display={'flex'} justifyContent={'center'}>
            <TextField inputRef={refMin} sx={{margin:'0 20px 0 0'}} id="new-game-min-value" label="Min" variant="outlined" />
            <TextField inputRef={refMax} sx={{margin:'0 20px 0 0'}} id="new-game-max-value" label="Max" variant="outlined" />
            <Button onClick={submit} variant="contained">Start New Game</Button>
        </Box>
    );
}

function onMutationEvent(callback: () => void) : (event: MutationEvent) => void {
    return  (event: MutationEvent) => {
        if(event.value === pending) {
            toast.loading("Submitting transaction ...", {id: event.id});
            return;
        }
        if (event.value instanceof MutationError) {
            toast.error("Failed to submit transaction", {id: event.id});
            return;
        }
        switch (event.value.type) {
            case "finalized":
                if (event.value.ok) {
                    toast.success("Submitted transaction with hash " + event.value.txHash, {id: event.id});
                    callback();
                } else {
                    console.error(event)
                    toast.error("Transaction failed: " + event.value?.dispatchError?.value?.value?.type, {id: event.id});
                }
                break;
            default:
                toast.loading("Transaction pending", {id: event.id});
        }
    }
}

export function Game() {

    const resetQueryError = useQueryErrorResetter();
    return (
        <div>
            <Box sx={{padding:"50px 40px 0 40px"}} display={'flex'} justifyContent={'center'}>
                <div className="md:w-[600px] content-block bg-[#191B1F] rounded-2xl px-2 py-8">
                    <GameIntro />
                </div>
            </Box>
            <ErrorBoundary
                FallbackComponent={ErrorFallback}
                onReset={() => resetQueryError()}
            >
                <div>
                    <Suspense fallback={<h2>Loading game ...</h2>}>
                        <CurrentGame />
                    </Suspense>
                    <NewGame />
                </div>
            </ErrorBoundary>
        </div>
    );
}

function ErrorFallback({ resetErrorBoundary }: FallbackProps) {
    return (
        <article>
            <header>
                <strong>Oops, something went wrong!</strong>
            </header>
            <button type="button" onClick={() => resetErrorBoundary()}>
                Retry
            </button>
        </article>
    );
}