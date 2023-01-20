/**
 * OpenAI GPT-3 Command Line Interface
 * Written by: @AxelRothe
 * License: MIT
 * Version: 1.0.0
 **/
import {program} from 'commander'
import commands from "./commands";
import core from "./core";

commands(program, core);

program.parse(process.argv)