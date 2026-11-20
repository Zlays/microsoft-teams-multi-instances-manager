import '@testing-library/jest-dom';
import { render, fireEvent, waitFor } from '@testing-library/react';
import App from '../App';

const clickElement = (el: HTMLElement) => {
  fireEvent.click(el);
};

const changeInput = (input: HTMLInputElement, value: string) => {
  fireEvent.change(input, { target: { value } });
};

describe('App Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    window.teamsManagerAPI = {
      getProfiles: jest.fn().mockResolvedValue(['TestProfile']),
      createProfile: jest.fn().mockResolvedValue({ success: true }),
      deleteProfile: jest.fn().mockResolvedValue({ success: true }),
      launchProfile: jest.fn().mockResolvedValue({ success: true }),
      getSettings: jest.fn().mockResolvedValue({ onStartup: true, autoLaunch: true }),
      updateSettings: jest.fn().mockResolvedValue(undefined),
    };
  });

  it('should render and load profiles and settings on mount', async () => {
    const { findByText, getByText } = render(<App />);

    expect(window.teamsManagerAPI.getSettings).toHaveBeenCalled();
    expect(window.teamsManagerAPI.getProfiles).toHaveBeenCalled();

    expect(await findByText('TestProfile')).toBeInTheDocument();
    expect(getByText('Run instances on startup')).toBeInTheDocument();
    expect(getByText('Run app on startup')).toBeInTheDocument();

    await waitFor(() => {
      expect(window.teamsManagerAPI.launchProfile).toHaveBeenCalledWith('TestProfile');
    });
  });

  it('should allow adding a new profile with sanitized input', async () => {
    (window.teamsManagerAPI.createProfile as jest.Mock).mockResolvedValueOnce({
      success: true,
    });

    const { findByText, getByPlaceholderText, getByText } = render(<App />);
    await findByText('TestProfile');

    const input = getByPlaceholderText('Enter profile name here...') as HTMLInputElement;
    const addButton = getByText('Add profile');

    changeInput(input, 'NewProfile!@#123');
    expect(input).toHaveValue('NewProfile123');

    clickElement(addButton);

    await waitFor(() => {
      expect(window.teamsManagerAPI.createProfile).toHaveBeenCalledWith('NewProfile123');
    });

    expect(await findByText('NewProfile123')).toBeInTheDocument();
    expect(input).toHaveValue('');
  });

  it('should display an error when attempting to add an already existing profile', async () => {
    const { findByText, getByPlaceholderText, getByText } = render(<App />);
    await findByText('TestProfile');

    const input = getByPlaceholderText('Enter profile name here...') as HTMLInputElement;
    const addButton = getByText('Add profile');

    changeInput(input, 'TestProfile');
    clickElement(addButton);

    expect(await findByText('Name of the profile already used')).toBeInTheDocument();
    expect(window.teamsManagerAPI.createProfile).not.toHaveBeenCalled();
  });

  it('should launch a profile when run button is clicked', async () => {
    const { findByText, getByText } = render(<App />);
    await findByText('TestProfile');

    const runButton = getByText('run');
    clickElement(runButton);

    await waitFor(() => {
      expect(window.teamsManagerAPI.launchProfile).toHaveBeenCalledWith('TestProfile');
    });
  });

  it('should delete a profile when delete button is clicked', async () => {
    const { findByText, getByText, queryByText } = render(<App />);
    await findByText('TestProfile');

    const deleteButton = getByText('delete');
    clickElement(deleteButton);

    await waitFor(() => {
      expect(window.teamsManagerAPI.deleteProfile).toHaveBeenCalledWith('TestProfile');
    });

    await waitFor(() => {
      expect(queryByText('TestProfile')).not.toBeInTheDocument();
    });
  });

  it('should show an error message if profile deletion fails because Teams is open', async () => {
    (window.teamsManagerAPI.deleteProfile as jest.Mock).mockResolvedValueOnce({
      success: false,
      error: 'Please close Teams before deleting the profile',
    });

    const { findByText, getByText } = render(<App />);
    await findByText('TestProfile');

    const deleteButton = getByText('delete');
    clickElement(deleteButton);

    expect(
      await findByText('Please close Teams before deleting the profile')
    ).toBeInTheDocument();
  });

  it('should update settings when toggling checkboxes', async () => {
    const { findByText, getByLabelText } = render(<App />);
    await findByText('TestProfile');

    const onStartupCheckbox = getByLabelText('Run instances on startup') as HTMLInputElement;
    const autoLaunchCheckbox = getByLabelText('Run app on startup') as HTMLInputElement;

    expect(onStartupCheckbox).toBeChecked();
    expect(autoLaunchCheckbox).toBeChecked();

    clickElement(onStartupCheckbox);

    await waitFor(() => {
      expect(window.teamsManagerAPI.updateSettings).toHaveBeenCalledWith({
        onStartup: false,
        autoLaunch: true,
      });
    });

    clickElement(autoLaunchCheckbox);

    await waitFor(() => {
      expect(window.teamsManagerAPI.updateSettings).toHaveBeenCalledWith({
        onStartup: false,
        autoLaunch: false,
      });
    });
  });
});
