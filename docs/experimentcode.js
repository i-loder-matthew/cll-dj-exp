/*
If your stims have specific blocks, set to true

If set to true, stims.csv must contain column called "block"
*/ 
const blocks = false; 
const numBlocks = 2;

// initialize jsPsych
var jsPsych = initJsPsych({
    show_progress_bar: true, 
    auto_update_progress_bar: true, //update automatically with each trial
    on_finish: function () {
        jsPsych.data.displayData(); // optional
    }
});

function loadCSV(filepath) {
  return new Promise((resolve, reject) => {
    Papa.parse(filepath, {
      download: true,
      header: true,        // uses first row as object keys
    //   dynamicTyping: true, // auto-converts numbers/booleans
      skipEmptyLines: true,
      complete: (results) => resolve(results.data),
      error: (err) => reject(err)
    });
  });
};

Promise.all([
  loadCSV('stimuli/01-main-stim.csv'),
  loadCSV('stimuli/01-distractors.csv')
]).then(([rawStimuli, rawDistractors]) => {
    stimuli = jsPsych.randomization.shuffle(rawStimuli);
    distractors = jsPsych.randomization.shuffle(rawDistractors);
    startExperiment();
}).catch(err => console.error("Failed to load stimuli:", err));



// Generate random name for participant and datafile
const subject_id = jsPsych.randomization.randomID(10);
const filename = `${subject_id}.csv`;

// Main function that creates slides and runs experiment
function startExperiment() {

    // main timeline
    var timeline = [];

    // welcome and consent
    var Welcome_page = {
        type: jsPsychHtmlButtonResponse,
        stimulus: `
            <p><strong>Welcome to the experiment!</strong></p>
            `,
        choices: ["Continue"]
    };

    var Consent_page = {
        type: jsPsychHtmlButtonResponse,
        stimulus: `<div id="consent-text"><p>By completing this survey you acknowledge that this is an academic survey conducted by NYU researchers studying language. The survey is expected to take up to 15 minutes. Information that could be used to identify you may be kept indefinitely, but will remain confidential. Because of the nature of the study, the information we are collecting cannot be deleted or otherwise forgotten and we may not be able to provide you with it. You will be paid if you complete all parts of this survey. If you have any questions about the study, contact Lucas Champollion at champollion@nyu.edu. If you have any questions about your rights as a research subject, contact the NYU IRB at ask.humansubjects@nyu.edu (or gdpr-info@nyu.edu for participants in Europe) Please reference the IRB protocol number -- IRB-FY2020-4913 -- when emailing.</p> </div>
        <p>By clicking continue, you consent to participate.</p>`,
        choices: ["Continue"]
    };

    // Need to add feedback to this item
    var Practice_Intro_page = {
        type: jsPsychHtmlButtonResponse,
        stimulus: `
        <p>Let's try a few practice tasks. </p>
        <div class="instructions-text"><p>On each page, you will see a short sentence.  In these sentences, there are one or more words missing, indicated by '___'. For each item, you should read the sentence and then select a word to fill in the blank and complete the sentence. Pick whichever option sounds most natural to you. </p></div>
        <p> Whenever you're ready to start with the practice items, select continue. </p>
    `,
        choices: ["Continue"]
    };
 

    // Define slides that will be repeated over and over (fixation cross and blank screen)
    var fixation = {
        type: jsPsychHtmlKeyboardResponse,
        stimulus: '<div style="font-size:40px;">+</div>',
        choices: "NO_KEYS",
        trial_duration: 300 //ms that fixation cross is on screen
    };

    var blank = {
        type: jsPsychHtmlKeyboardResponse,
        stimulus: ' ',
        choices: "NO_KEYS",
        trial_duration: 300 //ms in between fixation cross and stimulus
    };


    // Create Practice Trials with correct responses
    const practice_stims = [
        { stimulus: "I have two ___ in my bag.", choices: ["book", "books"], correct_response: 1},
        { stimulus: "The three ___ are on the table.", choices: ["trophies", "trophy"], correct_response: 0},
        { stimulus: "There is one ___ in that window.", choices: ["plant", "plants"], correct_response: 0}
        // { stimulus: "Do you believe that he ____ to class everyday?", choices: ["to come", "comes"], correct_response: 1},
        // { stimulus: "Marybeth hopes for John ____ the prize.", choices: ["to win", "wins"], correct_response: 0},
        // { stimulus: "I wonder whether she knows that Mark ____ the book.", choices: ["has", "to have"], correct_response: 0},
        // { stimulus: "Brutus hopes that Ceasar ___ surprised.", choices: ["to be", "is"], correct_response: 1}
    ]

    // Create array to hold practice trials
    const practice = [];

    // loop through all practice stimuli to create practice trials
    for (let i = 0; i < practice_stims.length; i++) {
        /* 
        For each practice trial, create a [fixation cross, blank page, conditional_loop]
        conditional_loop consists of a normal trial and a feedback page, if the answer is not correct
        the conditional_loop will loop back to through trail - feedback pages until the participant gets
        the answer correct.
        */
        const stimulus = practice_stims[i].stimulus;
        const choices = practice_stims[i].choices;
        const correct_response = practice_stims[i].correct_response;

        const trial = {
            type: jsPsychHtmlButtonResponse,
            stimulus: `<p><i>Read the utterance and then select a word to fill in the blank.</i></p>
            <div id="trial-stim-text"><p>${stimulus}</p></div>
            <p><i>Which sounds better to you?</i></p>
            `,
            choices: choices,
            data: {
            type_of_trial: "practice",
            stimulus: stimulus,
            correct_response: correct_response
            },
            on_finish: function(data) {
            data.correct = data.response === data.correct_response;
            }
        };

        const feedback = {
            type: jsPsychHtmlKeyboardResponse,
            stimulus: function() {
                const last_trial_val = jsPsych.data.get().last(1).values()[0].response;
                const last_trial_correct = jsPsych.data.get().last(1).values()[0].correct;
                if (last_trial_correct) {
                    return "<div style='color: #20ad03;'>Correct!</div>";
                } else {
                    return "<div style='color: red;'> Incorrect. Try again.</div>";
                }
            },
            choices: "NO_KEYS",
            trial_duration: 1000
        };

        const conditional_loop = {
            timeline: [trial, feedback],
            loop_function: function(data) {
                const last_response = data.values()[0];
                return !last_response.correct; // repeat if incorrect
            }
        };

        practice.push({
            timeline: [blank, conditional_loop] // removing fixations
        });
    };

    var mainIntro_page = {
        type: jsPsychHtmlButtonResponse,
        stimulus: `
        <p>Now let's move onto the main experiment!</p>
    `,
        choices: ["Continue"],
    };


    // Function to create the stimulus trials
    function createTrial(stim) {
        return {
            type: jsPsychHtmlButtonResponse,
            stimulus: `
                <p><i>Read the sentence and then select a word to fill in the blank.</i></p>
                <div id="trial-stim-text"><p>${stim.stimulus}</p></div>
                <p><i>Which sounds better to you?</i></p>
            `,
            choices: [stim.first, stim.second],
            data: {
                id: stim.stimulus_id,
                text: stim.stimulus,
                connective: stim.connective,
                type_of_trial: stim.trial_type,
                correct_response: stim.correct_response,
            },
            // might be able to remove this code...
            on_finish: function(data) {
                console.log("correct response: " + stim.correct_response);
                console.log("Response: " + data.response);
                // update number of correct trials in this block
                // if (stim.correct_response == data.response) {
                //     n_correct += 1;
                // }
            }
        };
    };
    
    // Array to hold all blocks
    main_trials = [];

    /*
    Break slide

    In order to update the number of correct responses for each block dynamically, this is coded
    as a function, which returns a slide. The function is executed whenever the timeline reaches the break slide

    input: n_counter, number of trials in this block
    */
    function createBreakSlide(n_counter) {
        return {
            type: jsPsychHtmlKeyboardResponse,
            stimulus: function() {
                return "<p> You got " + Math.round((n_correct/n_counter)*100) + "% correct thus far. Take a short break! When you are ready to continue, press space. </p>";
            },
            choices: [" "], // User presses space to continue after the break
            on_finish: function (data) {
                // reset counters for next block
                n_correct = 0;  
            },
        };
    };

    function createAttentionCheck(n_counter) {

        first_slide = {
            type: jsPsychHtmlButtonResponse, 
            stimulus: function() {
                return "<div class='instructions-text'><p> You have made it through the first " + (n_counter + 1) + "/" + numBlocks + " of the experiment. Select continue whenever you are ready! </p></div>";
            },
            choices: ["Continue"]
        };

        return first_slide;


    };



    // If you have blocks in your experiment, generate main trials for each block
    if (blocks) {

        n_counter = 0;
        n_correct = 0;
        
        let block_trials = [];

        // Loop through stimuli
        for (let i = 0; i < stimuli.length; i++) {

            let stim = stimuli[i];
            let word_trial = createTrial(stim);

            // update counter
            n_counter += 1;

            // Add the trials in blocks
            block_trials.push({
                timeline: [fixation, blank, word_trial]
            });

            // if we are in the last stimulus, don't have a break page:

            if (i === stimuli.length - 1) {
                // randomize order within the block
                block_trials = jsPsych.randomization.shuffle(block_trials);

                // Add this block to the main trials
                main_trials.push(block_trials);
            } else if (i + 1 === stimuli.length || Number(stimuli[i + 1].block) !== Number(stim.block)) {
            
                // Otherwise, if it is not the last stim in the experiment, but is the last stim in the block
                
                // randomize order within the block
                block_trials = jsPsych.randomization.shuffle(block_trials);

                // If it's the last trial in the current block, add the break page
                block_trials.push(createBreakSlide(n_counter));

                // Add this block to the main trials
                main_trials.push(block_trials);

                // empty block trials array to populate for the next block
                block_trials = [];

                // update counter for number of trials in a block
                n_counter = 0;
            };
        };
    } else {
      // If you don't have blocks, make trials based on number of breaks you want

        let target_per_block = stimuli.length / numBlocks;
        let distractors_per_block = distractors.length / numBlocks;

        for (let k = 0; k < numBlocks; k++) {

            let trials = []; 

            for (let i = 0; i < target_per_block; i++) {
                let stim = stimuli[i + (k * target_per_block)];
                console.log(stim);
                let trial = createTrial(stim);

                trials.push([trial]);
                console.log(trials);

            };

            for (let i = 0; i < distractors_per_block; i++) {
                let stim = distractors[i + (k * distractors_per_block)];
                console.log(stim);
                let trial = createTrial(stim);

                trials.push([trial]);
                console.log(trials);
            };


            trials = jsPsych.randomization.shuffle(trials);
            main_trials.push(trials);

            if (k < numBlocks - 1) {
                attention_check = createAttentionCheck(k);
                main_trials.push([attention_check]);
            };

        };

        
    };

    // Demographics
    var demographics = {
        type: jsPsychSurveyHtmlForm,
        preamble: '<h3>Final Questions</h3><p>Please answer all questions below before continuing.</p>',
        html: `
            <label for="name">Name:</label><br>
            <input type="text" id="name" name="name" required><br><br>

            <label for="gender">Gender:</label><br>
            <select id="gender" name="gender" required>
                <option value="" disabled selected>Select your gender</option>
                <option value="Male">Male</option>
                <option value="Female">Female</option>
                <option value="Other">Other</option>
            </select><br><br>
        `,
        button_label: "Continue",
        on_finish: function(data) {
            const responses = data.response;
            jsPsych.data.addProperties({
                participant_name: responses.name,
                participant_gender: responses.gender
            });
                                            

        },
        data: {
            type_of_trial: "survey",
        }
    };

    /* 
    Trial that saves data to osf(datapipe). It will show (in English) "Please wait while data is being saved"

    Comment it out in the timeline below while testing

    Update experiment_id with the experiment id generated for you in datapipe (see readme)
    */
    const save_data = {
        type: jsPsychPipe,
        action: "save",
        experiment_id: "SO5rDbedLpuU", // replace with your experiment id
        filename: filename,
        data_string: ()=>jsPsych.data.get().csv()
    };

    /* 
    End screen

    When testing, uncomment the last line to download the csv file locally
    */
    var end = {
        type: jsPsychHtmlButtonResponse,
        stimulus: "<h2>END</h2><p>Thank you for participating! And your completion ID is: C1QKT26K</p>",
        choices: [],
        on_load: function() {
            console.log(jsPsych.data);
            // jsPsych.data.get().localSave('csv', 'experiment_data.csv');
        }
    };  

    /*
    Push all slides to the timeline
    */
    timeline.push(Welcome_page, 
                Consent_page, 
                Practice_Intro_page, 
                practice, 
                mainIntro_page,
                main_trials,
                demographics,
                save_data, // comment this out while testing to not save the data
                end);

    // run
    jsPsych.run(timeline);
}
