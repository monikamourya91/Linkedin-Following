var totalFollowing = 0;
var followingsCount = 0;
const popcontent = `<div class="status-bar" >
                      <div class="modal-body">
                        <h2 class="mb-4" id="scrap-status">Scrapping in Process</h2>
                      </div>
                    </div>`;
chrome.runtime.onMessage.addListener(function(message, sender, send_response) {
  if(message.from == 'background' && message.type == 'infoScraping'){
    console.log(message);
    scrapSingleProfileInfo();
  }else if(message.from == 'background' && message.type == 'downloadCsv'){
    downloadCsvFile(message.data);
  }   
})

function downloadCsvFile(csvData){
    var textToBLOB = new Blob([csvData], { type: 'text/plain' });
    var sFileName = 'following-profiles.xlsx';	   // The file to save the data.
    var newLink = document.createElement("a");
    newLink.download = sFileName;
    newLink.href = window.URL.createObjectURL(textToBLOB);
    newLink.style.display = "none";
    document.body.appendChild(newLink);
    newLink.click();
    document.getElementById('scrap-status').innerText = 'Scrapping Complete';
    setTimeout(()=>{
      const overlay = document.getElementById('overlay');
      if (overlay) {
        overlay.style.display = 'none'; // Show the overlay
      }
    },3000);
  }

function createScrapButton() {
  const scrapBtn = document.createElement('button');
  scrapBtn.textContent = 'Scrap Following';
  scrapBtn.id = 'start-scrap';
  return scrapBtn;
}

function addScrapButtonToHeading(scrapBtn) {
  const headingElement = document.querySelector('h1');
  headingElement.appendChild(scrapBtn);
}

function initial() {
  if (window.location.href.includes('/network-manager/')) {
    const scrapBtn = createScrapButton();
    addScrapButtonToHeading(scrapBtn);
    appendOverlay();
    scrapBtn.addEventListener('click', scrapFollowing);
  }
}

function appendOverlay() {
  const overlay = document.createElement('div');
  overlay.id = 'overlay';

  const showModel = document.createElement('div');
  showModel.id = 'show_model';

  const showModelContent = document.createElement('div');
  showModelContent.id = 'show_model_content';

  showModel.appendChild(showModelContent);
  overlay.appendChild(showModel);
  document.body.appendChild(overlay);
}

function showOverlayWithContent(content) {
  const overlay = document.getElementById('overlay');
  const showModelContent = document.getElementById('show_model_content');
  
  if (overlay) {
    overlay.style.display = 'block'; // Show the overlay
  }
  
  if (showModelContent) {
    showModelContent.innerHTML = content; // Set the HTML content
    document.getElementById('scrap-status').innerText = 'Scrapping in Process';
  }
}

async function scrapFollowing() {
  // Extract total following count from subtitle
  const subTitle = document.querySelector('.mn-network-manager__subtitle');
  const numbers = subTitle.textContent.match(/\d/g);
  const totalFollowing = numbers.length > 0 ? Number(numbers.join('')) : 0;
  if(totalFollowing > 0){
    showOverlayWithContent(popcontent);
  }

  try {
      // Get initial count of followings
      const initialFollowingsCount = await getFollowingsLi();

      // Scroll the window to load more followings
      scrollWindow();

      // Scroll interval to check for new followings and update counts
      const scrollIntervalId = setInterval(async () => {
          const scrollBtn = document.querySelector('button.scaffold-finite-scroll__load-button');

          if (scrollBtn) {
              scrollWindow();
              const currentFollowingsCount = await getFollowingsLi();

              if (totalFollowing > currentFollowingsCount) {
                  // If more followings need to be loaded, continue scrolling
                  console.log('Number of followings:', currentFollowingsCount);
                  followingsCount = currentFollowingsCount;
              } else {
                  // Stop interval when all followings are loaded
                  clearInterval(scrollIntervalId);
                  startScrapingData();
              }
          } else {
              // If scroll button not found, stop interval and start scraping
              clearInterval(scrollIntervalId);
              startScrapingData();
          }
      }, 1000); // Adjust the interval time as needed
  } catch (error) {
      console.error('Error:', error);
  }
}

async function getFollowingsLi() {
  try {
      const followings = await document.querySelectorAll('ul.reusable-search__entity-result-list li');
      return followings.length;
  } catch (error) {
      console.error('Error fetching followings:', error);
      return 0;
  }
}

function scrollWindow(){
  const yPosition = document.documentElement.scrollHeight - window.innerHeight;
  window.scrollTo(0, yPosition); 
}

async function startScrapingData() {
  try {
      const followings = document.querySelectorAll('ul.reusable-search__entity-result-list li');
      const followingArray = Array.from(followings).map(following => following.querySelector('a').getAttribute('href'));

      console.log(followingArray);

      chrome.runtime.sendMessage({
          type: 'followingLinks',
          data: followingArray,
      });
  } catch (error) {
      console.error('Error fetching followings:', error);
  }
}

initial();


// Start followings Profile scraping
async function clickAndWait(selector, timeout) {
    return new Promise(resolve => {
        const element = document.querySelector(selector);
        if (element) {
            element.click();
            const intervalId = setInterval(() => {
                console.log(document.querySelector(selector));
                if (!document.querySelector(selector)) {
                    clearInterval(intervalId);
                    resolve();
                }
            }, 200);
        } else {
            resolve();
        }
    });
}

async function getProfileData() {
    const data = {};

    const nameTag = await getSelector('.pv-text-details__left-panel h1')
    data.name = nameTag?.innerText || '';

    const descriptionElement = await getSelector('.pv-text-details__left-panel .text-body-medium');
    data.heading = descriptionElement?.innerText || '';

    data.profileUrl = window.location.href;

    const followerElement = await getSelector('ul.pv-top-card--list li');
    data.follower = followerElement?.innerText || '';


    const spanElements = document.querySelectorAll('.pv-text-details__left-panel .text-body-small');
    if (spanElements.length > 0) {
        const locationIndex = spanElements.length - 1;
        data.location = spanElements[locationIndex]?.innerText || '';

        if (spanElements.length === 3) {
            data.talksAbout = spanElements[1]?.innerText || '';
        }
    }

    return data;
}

async function scrapSingleProfileInfo() {
  try {
      const followingProfiles = await new Promise(resolve => {
          chrome.storage.local.get(['followingProfiles'], result => {
              const profiles = result.followingProfiles || [];
              resolve(profiles);
          });
      });

      const data = await getProfileData();
      const contactElement = document.querySelector('.pv-text-details__left-panel .text-body-small.inline');
      const contactLink = contactElement?.nextElementSibling?.querySelector('a');

      if (contactLink) {
          contactLink.click();
          const intervalId = setInterval(() => {
              console.log('in 1');
              const contactInfoSection = document.querySelector('section.pv-contact-info h2');
              if (contactInfoSection) {
                  clearInterval(intervalId);
                  setTimeout(() => {
                    console.log('in 2');
                    const contactInfoElement = document.querySelector('li.pv-contact-info__ci-container span');
                    const emailElement = document.querySelector('.pv-contact-info__contact-type.ci-email div a');
                    const contactInfo = contactInfoElement?.innerText || '';
                    const email = emailElement?.innerText || '';
                    data.contactInfo = `${contactInfo}${contactInfo && email ? '/' : ''}${email}`;
                    console.log(data);


                    setTimeout(()=>{
                      document.querySelector('button[aria-label="Dismiss"]').click();
                    },2000);
                    followingProfiles.push(data);
                    console.log(followingProfiles);
                    chrome.storage.local.set({ 'followingProfiles': followingProfiles }, () => {
                      chrome.runtime.sendMessage({ action: 'scraped_following_details' });
                    });
                  }, 200);
              }
          }, 2000);
      }else{
        followingProfiles.push(data);
        console.log(followingProfiles);
        chrome.storage.local.set({ 'followingProfiles': followingProfiles }, () => {
          chrome.runtime.sendMessage({ action: 'scraped_following_details' });
        });
      }

  } catch (error) {
    console.error('An error occurred:', error);
  }
}

async function getSelector(selector) {
  return new Promise((resolve) => {
    const element = document.querySelector(selector);
    if (element) {
      resolve(element);
    } else {
      const observer = new MutationObserver(() => {
        const observedElement = document.querySelector(selector);
        if (observedElement) {
          resolve(observedElement);
          observer.disconnect();
        }
      });
      observer.observe(document.body, { childList: true, subtree: true });
    }
  });
}



































