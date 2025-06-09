mod utils;

use futsolver::{groups, Solution};
use wasm_bindgen::prelude::*;
use web_sys::console::{self, log};

#[wasm_bindgen]
extern "C" {
    fn alert(s: &str);

}

#[wasm_bindgen]
pub fn greet(name: &str) {
    alert(&format!("Hello, {}!", name));
}

#[wasm_bindgen]
pub fn run_collesort(array: Vec<f64>, teams: usize) -> Result<Vec<f64>, String> {
    // log(&format!("Starting ColleSort with array: {:?}", array));
    if teams == 0 {
        return Err("Number of teams must be greater than 0".to_string());
    }
    if array.len() % teams != 0 {
        return Err(format!(
            "Array length must be a multiple of the number of teams ({}), but got {}",
            teams,
            array.len()
        ));
    }
    match teams {
        2 => run_collesort_w::<2>(array),
        3 => run_collesort_w::<3>(array),
        4 => run_collesort_w::<4>(array),
        5 => run_collesort_w::<5>(array),
        _ => Err(format!(
            "Unsupported number of teams: {}. Supported values are from 2 to 5.",
            teams
        )),
    }
}

pub fn run_collesort_w<const K: usize>(array: Vec<f64>) -> Result<Vec<f64>, String> {
    let len = array.len();
    match len {
        2 => run_collesort_with::<2, K>(array),
        3 => run_collesort_with::<3, K>(array),
        4 => run_collesort_with::<4, K>(array),
        5 => run_collesort_with::<5, K>(array),
        6 => run_collesort_with::<6, K>(array),
        7 => run_collesort_with::<7, K>(array),
        8 => run_collesort_with::<8, K>(array),
        9 => run_collesort_with::<9, K>(array),
        10 => run_collesort_with::<10, K>(array),
        11 => run_collesort_with::<11, K>(array),
        12 => run_collesort_with::<12, K>(array),
        13 => run_collesort_with::<13, K>(array),
        14 => run_collesort_with::<14, K>(array),
        15 => run_collesort_with::<15, K>(array),
        16 => run_collesort_with::<16, K>(array),
        17 => run_collesort_with::<17, K>(array),
        18 => run_collesort_with::<18, K>(array),
        19 => run_collesort_with::<19, K>(array),
        20 => run_collesort_with::<20, K>(array),
        21 => run_collesort_with::<21, K>(array),
        22 => run_collesort_with::<22, K>(array),
        23 => run_collesort_with::<23, K>(array),
        24 => run_collesort_with::<24, K>(array),
        _ => Err(format!(
            "Unsupported array length: {}. Supported lengths are from 2 to 24.",
            len
        )),
    }
}
pub fn run_collesort_with<const SIZE: usize, const K: usize>(
    array: Vec<f64>,
) -> Result<Vec<f64>, String> {
    // log(&format!("Starting ColleSort with array: {:?}", array));
    assert!(SIZE > 0, "SIZE must be greater than 0");
    assert!(K > 0, "K must be greater than 0");
    assert!(SIZE % K == 0, "SIZE must be a multiple of K");
    assert!(K <= SIZE, "K must be less than or equal to SIZE");
    if array.len() != SIZE {
        return Err(format!("Array must have exactly {} elements", SIZE));
    }
    let input = futsolver::prepare_input::<SIZE>(array);
    let upperbound = futsolver::greedy_upper_bound::<SIZE, K>(input);

    console::log_1(
        &format!(
            "Running ColleSort with SIZE: {}, K: {}, upperbound: {}",
            SIZE, K, upperbound
        )
        .into(),
    );
    let groups_iter = groups::<SIZE, K>(input);
    console::log_1(&"Groups iterator created".into());

    for Solution {
        solution,
        amplitude: _,
    } in groups_iter
    {
        // TODO: Check if the solution is valid

        return Ok(solution.into_iter().map(|x| *x as f64).collect());
    }
    Err("Failed to find a solution".to_string())
}
