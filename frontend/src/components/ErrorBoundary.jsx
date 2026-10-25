import { Component } from 'react';

export default class ErrorBoundary extends Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false };
    }

    static getDerivedStateFromError() {
        return { hasError: true };
    }

    render() {
        if (this.state.hasError) {
            return (
                <div className="empty-state" role="alert">
                    <h2>Something went wrong</h2>
                    <p>Reload the page to continue.</p>
                    <button className="btn btn-primary" onClick={() => window.location.reload()}>Reload page</button>
                </div>
            );
        }
        return this.props.children;
    }
}
