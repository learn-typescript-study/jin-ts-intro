import axios, { AxiosResponse } from 'axios';
import { CategoryScale, Chart, LinearScale, LineController, LineElement, PointElement, Title } from 'chart.js';
import { Country, CountryInfo, CountryInfoResponse, CovidStatus, CovidSummaryResponse } from './covid';

// utils
const $ = <T>(selector: string) => document.querySelector(selector) as unknown as T;

const getUnixTimestamp = (date: number | string | Date): number => new Date(date).getTime();

const createSpinnerElement = (id: string): HTMLDivElement => {
  const wrapperDiv = document.createElement('div');
  wrapperDiv.setAttribute('id', id);
  wrapperDiv.setAttribute('class', 'spinner-wrapper flex justify-center align-center');
  const spinnerDiv = document.createElement('div');
  spinnerDiv.setAttribute('class', 'ripple-spinner');
  spinnerDiv.appendChild(document.createElement('div'));
  spinnerDiv.appendChild(document.createElement('div'));
  wrapperDiv.appendChild(spinnerDiv);
  return wrapperDiv;
};

// 결과 값을 단언을 해준다( querySelector 함수에 결과값을 확신할수 없다)
const confirmedTotal = $('.confirmed-total') as HTMLSpanElement;
const deathsTotal = $('.deaths') as HTMLParagraphElement;
const recoveredTotal = $('.recovered') as HTMLParagraphElement;
const lastUpdatedTime = $('.last-updated-time') as HTMLParagraphElement;
const rankList = $('.rank-list') as HTMLOListElement;
const deathsList = $('.deaths-list') as HTMLOListElement;
const recoveredList = $('.recovered-list') as HTMLOListElement;
const deathSpinner = createSpinnerElement('deaths-spinner');
const recoveredSpinner = createSpinnerElement('recovered-spinner');

// state
let isDeathLoading = false;

const fetchCovidSummary = (): Promise<AxiosResponse<CovidSummaryResponse>> => {
  const url = 'https://api.covid19api.com/summary';
  return axios.get(url);
};

const fetchCountryInfo = (countryCode: any, status: CovidStatus): Promise<AxiosResponse<CountryInfoResponse>> => {
  const url = `https://api.covid19api.com/country/${countryCode}/status/${status}`;
  return axios.get(url);
};

// methods
const startApp = () => {
  setupChartJs();
  setupData();
  initEvents();
};

// events
function initEvents() {
  rankList.addEventListener('click', handleListClick);
}

async function handleListClick(event: MouseEvent) {
  let selectedId;
  if (event.target instanceof HTMLParagraphElement || event.target instanceof HTMLSpanElement) {
    selectedId = event.target.parentElement.id;
  }
  if (event.target instanceof HTMLLIElement) {
    selectedId = event.target.id;
  }
  if (isDeathLoading) {
    return;
  }
  clearDeathList();
  clearRecoveredList();
  startLoadingAnimation();
  isDeathLoading = true;
  const { data: deathResponse } = await fetchCountryInfo(selectedId, CovidStatus.Deaths);
  const { data: recoveredResponse } = await fetchCountryInfo(selectedId, CovidStatus.Recovered);
  const { data: confirmedResponse } = await fetchCountryInfo(selectedId, CovidStatus.Confirmed);
  endLoadingAnimation();
  setDeathsList(deathResponse);
  setTotalDeathsByCountry(deathResponse);
  setRecoveredList(recoveredResponse);
  setTotalRecoveredByCountry(recoveredResponse);
  setChartData(confirmedResponse);
  isDeathLoading = false;
}

const setDeathsList = (data: CountryInfoResponse): void => {
  const sorted = data.sort((a: CountryInfo, b: CountryInfo) => getUnixTimestamp(b.Date) - getUnixTimestamp(a.Date));
  sorted.forEach((value: CountryInfo) => {
    const li = document.createElement('li');
    li.setAttribute('class', 'list-item-b flex align-center');
    const span = document.createElement('span');
    span.textContent = value.Cases.toString();
    span.setAttribute('class', 'deaths');
    const p = document.createElement('p');
    p.textContent = new Date(value.Date).toLocaleDateString().slice(0, -1);
    li.appendChild(span);
    li.appendChild(p);
    deathsList.appendChild(li);
  });
};

const clearDeathList = (): void => (deathsList.innerHTML = null);

const setTotalDeathsByCountry = (data: CountryInfoResponse): void => {
  deathsTotal.innerText = data[0].Cases.toString();
};

const setRecoveredList = (data: CountryInfoResponse): void => {
  const sorted = data.sort((a: CountryInfo, b: CountryInfo) => getUnixTimestamp(b.Date) - getUnixTimestamp(a.Date));
  sorted.forEach((value: CountryInfo) => {
    const li = document.createElement('li');
    li.setAttribute('class', 'list-item-b flex align-center');
    const span = document.createElement('span');
    span.textContent = value.Cases.toString();
    span.setAttribute('class', 'recovered');
    const p = document.createElement('p');
    p.textContent = new Date(value.Date).toLocaleDateString().slice(0, -1);
    li.appendChild(span);
    li.appendChild(p);
    recoveredList.appendChild(li);
  });
};

const clearRecoveredList = (): void => (recoveredList.innerHTML = null);

const setTotalRecoveredByCountry = (data: CountryInfoResponse): void => {
  recoveredTotal.innerText = data[0].Cases.toString();
};

const startLoadingAnimation = (): void => {
  deathsList.appendChild(deathSpinner);
  recoveredList.appendChild(recoveredSpinner);
};

const endLoadingAnimation = (): void => {
  deathsList.removeChild(deathSpinner);
  recoveredList.removeChild(recoveredSpinner);
};

const setupData = async () => {
  const { data } = await fetchCovidSummary();
  setTotalConfirmedNumber(data);
  setTotalDeathsByWorld(data);
  setTotalRecoveredByWorld(data);
  setCountryRanksByConfirmedCases(data);
  setLastUpdatedTimestamp(data);
};

// arf
const setupChartJs = () => {
  Chart.defaults.color = '#f5eaea';
  Chart.defaults.font = {
    lineHeight: undefined,
    size: 0,
    style: undefined,
    weight: undefined,
    family: 'Exo 2',
  };
  Chart.register(LineController, LineElement, PointElement, LinearScale, Title, CategoryScale);
};

const renderChart = (data: number[], labels: string[]) => {
  const canvas = <HTMLCanvasElement>$('#lineChart');

  const ctx = canvas.getContext('2d');

  new Chart(ctx, {
    type: 'line',
    data: {
      labels,
      datasets: [
        {
          label: 'Confirmed for the last two weeks',
          backgroundColor: '#feb72b',
          borderColor: '#feb72b',
          data,
        },
      ],
    },
    options: {},
  });
};

const setChartData = (data: CountryInfoResponse): void => {
  const chartData = data.slice(-14).map((value: CountryInfo) => value.Cases);
  const chartLabel = data.slice(-14).map((value: CountryInfo) => new Date(value.Date).toLocaleDateString().slice(5, -1));
  renderChart(chartData, chartLabel);
};

const setTotalConfirmedNumber = (data: CovidSummaryResponse) => {
  confirmedTotal.innerText = data.Countries.reduce(
    (total: number, current: Country) => (total += current.TotalConfirmed),
    0
  ).toString();
};

const setTotalDeathsByWorld = (data: CovidSummaryResponse): void => {
  deathsTotal.innerText = data.Countries.reduce(
    (total: number, current: Country) => (total += current.TotalDeaths),
    0
  ).toString();
};

const setTotalRecoveredByWorld = (data: CovidSummaryResponse): void => {
  recoveredTotal.innerText = data.Countries.reduce(
    (total: number, current: Country) => (total += current.TotalRecovered),
    0
  ).toString();
};

const setCountryRanksByConfirmedCases = (data: CovidSummaryResponse) => {
  const sorted = data.Countries.sort((a: any, b: any) => b.TotalConfirmed - a.TotalConfirmed);
  sorted.forEach((value: any) => {
    const li = document.createElement('li');
    li.setAttribute('class', 'list-item flex align-center');
    li.setAttribute('id', value.Slug);
    const span = document.createElement('span');
    span.textContent = value.TotalConfirmed;
    span.setAttribute('class', 'cases');
    const p = document.createElement('p');
    p.setAttribute('class', 'country');
    p.textContent = value.Country;
    li.appendChild(span);
    li.appendChild(p);
    rankList.appendChild(li);
  });
};

const setLastUpdatedTimestamp = (data: CovidSummaryResponse): void => {
  lastUpdatedTime.innerText = new Date(data.Date).toLocaleString();
};

startApp();
